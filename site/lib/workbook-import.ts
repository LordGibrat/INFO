import ExcelJS from "exceljs";
import { db } from "./db";
import { buildWorkbook } from "./export";
import { listOrders, type Order } from "./orders";
import { adminUpdateSchema, type AdminUpdate } from "./validation";
import { ExcelError, fieldHeaders, orderFields, sheetCells, validateXlsxArchive } from "./microsoft";

// Stay below the hosting platform's request-body limit, including HTTP overhead.
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
type Fields = Required<AdminUpdate>;
export type WorkbookUpdate = { id: string; expectedUpdatedAt: string; fields: Fields };
const editable = Object.keys(fieldHeaders) as (keyof Fields)[];

export async function readWorkbookBody(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== XLSX_CONTENT_TYPE) throw new ExcelError("XLSX_REQUIRED", 415);
  if (Number(request.headers.get("content-length") || 0) > MAX_IMPORT_BYTES) throw new ExcelError("IMPORT_TOO_LARGE", 413);
  if (!request.body) throw new ExcelError("INVALID_WORKBOOK");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMPORT_BYTES) { await reader.cancel(); throw new ExcelError("IMPORT_TOO_LARGE", 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function loadImportWorkbook(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_IMPORT_BYTES) throw new ExcelError("IMPORT_TOO_LARGE", 413);
  validateXlsxArchive(bytes);
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer); }
  catch { throw new ExcelError("INVALID_WORKBOOK"); }
  return workbook;
}

/** Preview and validate the whole file before any database mutation. */
export async function prepareWorkbookImport(workbook: ExcelJS.Workbook, orders: Order[]): Promise<WorkbookUpdate[]> {
  const remote = sheetCells(workbook);
  const current = sheetCells(await buildWorkbook(orders));
  if (JSON.stringify(remote.headers) !== JSON.stringify(current.headers)) throw new ExcelError("INVALID_WORKBOOK");
  const idIndex = remote.headers.indexOf("Тапсырыс ID");
  const versionIndex = remote.headers.indexOf("Жаңартылған уақыты");
  const mutableIndices = Object.fromEntries(editable.map(field => [field, remote.headers.indexOf(fieldHeaders[field])])) as Record<keyof Fields, number>;
  const allowed = new Set(Object.values(mutableIndices));
  if (idIndex < 0 || versionIndex < 0 || allowed.has(-1)) throw new ExcelError("INVALID_WORKBOOK");
  const byId = new Map(orders.map((order, index) => [order.id, { order, cells: current.rows[index] }]));
  const seen = new Set<string>(), changes: WorkbookUpdate[] = [];
  for (const cells of remote.rows) {
    const id = cells[idIndex], known = byId.get(id);
    if (!known || seen.has(id)) throw new ExcelError("INVALID_WORKBOOK");
    seen.add(id);
    for (let i = 0; i < cells.length; i++) {
      if (!allowed.has(i) && i !== versionIndex && cells[i] !== known.cells[i]) throw new ExcelError("READ_ONLY_CHANGED", 409);
    }
    const version = cells[versionIndex];
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(version) || Number.isNaN(Date.parse(version))) throw new ExcelError("INVALID_WORKBOOK");
    const unescape = (value: string) => /^'(?:\s*[=+\-@]|[\t\r\n])/.test(value) ? value.slice(1) : value;
    const rawCost = cells[mutableIndices.shippingCost].trim();
    const parsed = adminUpdateSchema.safeParse({
      status: cells[mutableIndices.status], adminNotes: unescape(cells[mutableIndices.adminNotes]),
      shippingCost: rawCost === "" ? null : (/^\d+(?:\.\d{1,2})?$/.test(rawCost) ? Number(rawCost) : NaN),
      trackingNumber: unescape(cells[mutableIndices.trackingNumber]),
    });
    if (!parsed.success) throw new ExcelError("INVALID_WORKBOOK");
    const fields = parsed.data as Fields, currentFields = orderFields(known.order);
    for (const field of editable) {
      if (cells[mutableIndices[field]] === known.cells[mutableIndices[field]]) Object.assign(fields, { [field]: currentFields[field] });
    }
    const edited = editable.some(field => fields[field] !== currentFields[field]);
    if (!edited) continue;
    if (version !== known.order.updatedAt) throw new ExcelError("STALE_IMPORT", 409);
    changes.push({ id, expectedUpdatedAt: version, fields });
  }
  return changes;
}

/** Lock all target rows, validate every version, then update the entire batch in one statement. */
export async function applyWorkbookImport(updates: WorkbookUpdate[]) {
  if (!updates.length) return 0;
  const records = updates.map(update => ({ id: update.id, expected: update.expectedUpdatedAt, ...update.fields }));
  const sql = db();
  const changed = await sql`WITH incoming AS (
    SELECT * FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb)
    AS x(id uuid,expected timestamptz,status text,"adminNotes" text,"shippingCost" numeric,"trackingNumber" text)
  ), locked AS MATERIALIZED (
    SELECT o.id,o.updated_at FROM muza_orders o JOIN incoming i ON o.id=i.id ORDER BY o.id FOR UPDATE OF o
  ), valid AS (
    SELECT NOT EXISTS(SELECT 1 FROM incoming i LEFT JOIN locked o ON o.id=i.id
      WHERE o.id IS NULL OR date_trunc('milliseconds',o.updated_at)<>i.expected) AS ok
  )
  UPDATE muza_orders o SET status=i.status,admin_notes=i."adminNotes",shipping_cost=i."shippingCost",tracking_number=i."trackingNumber",
    updated_at=GREATEST(date_trunc('milliseconds',clock_timestamp()),date_trunc('milliseconds',o.updated_at)+INTERVAL '1 millisecond')
  FROM incoming i,valid v WHERE o.id=i.id AND v.ok RETURNING o.id`;
  if (changed.length !== updates.length) throw new ExcelError("STALE_IMPORT", 409);
  return changed.length;
}

export async function importWorkbook(bytes: Buffer) {
  const workbook = await loadImportWorkbook(bytes);
  const updates = await prepareWorkbookImport(workbook, await listOrders());
  return { imported: await applyWorkbookImport(updates) };
}
export function importError(error: unknown) {
  const code = error instanceof ExcelError ? error.code : "IMPORT_UNAVAILABLE";
  const errors: Record<string, string> = {
    XLSX_REQUIRED: "Сайттан жүктелген .xlsx файлын таңдаңыз.",
    IMPORT_TOO_LARGE: "Файл тым үлкен. Шегі — 4 МБ.",
    WORKBOOK_TOO_LARGE: "Excel файлы тым үлкен немесе қауіпсіз өңдеу шегінен асады.",
    INVALID_WORKBOOK: "Файл пішімі немесе мәндері дұрыс емес. Сайттан жаңа .xlsx жүктеп, тек күй, ескертпе, жеткізу құны мен трек-нөмірді өзгертіңіз.",
    READ_ONLY_CHANGED: "Клиент деректері не техникалық баған өзгерген. Сайттан жаңа файл жүктеп, тек рұқсат етілген төрт бағанды өңдеңіз. Ешбір өзгеріс сақталмады.",
    STALE_IMPORT: "Файлдағы тапсырыс сайтта жаңартылған. Ешбір өзгеріс сақталмады. Жаңа .xlsx жүктеп, қажетті өзгерістерді соған көшіріп, қайта импорттаңыз.",
    IMPORT_UNAVAILABLE: "Импорт орындалмады. Соңғы деректерді жаңартып тексеріңіз және кейін қайталаңыз.",
  };
  return { error: errors[code] || errors.IMPORT_UNAVAILABLE, code, status: error instanceof ExcelError ? error.status : 503 };
}
