import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import { db } from "./db";
import { SESSION_COOKIE } from "./auth";
import { buildWorkbook } from "./export";
import { listOrders, type Order } from "./orders";
import { adminUpdateSchema, type AdminUpdate } from "./validation";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPE = "https://graph.microsoft.com/Files.ReadWrite offline_access";
const MAX_FILE = 5 * 1024 * 1024;
export const EXCEL_COOKIE = "muza_excel_oauth";
const editable = ["status", "adminNotes", "shippingCost", "trackingNumber"] as const;
type Editable = Required<AdminUpdate>;
type SnapshotRow = { id: string; updatedAt: string; fields: Editable; cells: string[] };
type Snapshot = { headers: string[]; rows: SnapshotRow[] };
export class ExcelError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function microsoftConfigured() {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.SITE_URL);
}
function config() {
  if (!microsoftConfigured()) throw new ExcelError("NOT_CONFIGURED", 503);
  const origin = new URL(process.env.SITE_URL!).origin;
  if (!origin.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) throw new ExcelError("NOT_CONFIGURED", 503);
  const tenant = process.env.MICROSOFT_TENANT_ID || "organizations";
  if (!/^[a-zA-Z0-9.-]+$/.test(tenant)) throw new ExcelError("NOT_CONFIGURED", 503);
  return { origin, redirectUri: `${origin}/api/admin/excel/callback`, tenant, clientId: process.env.MICROSOFT_CLIENT_ID!, clientSecret: process.env.MICROSOFT_CLIENT_SECRET! };
}
function key() {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32) throw new ExcelError("NOT_CONFIGURED", 503);
  return createHash("sha256").update(`muza-microsoft-v1:${secret}`).digest();
}
export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function decryptSecret(value: string) {
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw new ExcelError("RECONNECT", 401);
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
function cookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}
function sessionBinding(request: Request) { return createHash("sha256").update(cookie(request, SESSION_COOKIE)).digest("hex"); }
export function beginMicrosoftAuth(request: Request) {
  const c = config();
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const auth = new URL(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/authorize`);
  auth.search = new URLSearchParams({ client_id: c.clientId, response_type: "code", redirect_uri: c.redirectUri, response_mode: "query", scope: SCOPE, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", prompt: "select_account" }).toString();
  return { url: auth.toString(), cookie: encryptSecret(JSON.stringify({ state, verifier, binding: sessionBinding(request), expires: Date.now() + 600000 })) };
}
export function validateMicrosoftCallback(request: Request) {
  try {
    const value = JSON.parse(decryptSecret(cookie(request, EXCEL_COOKIE)));
    const params = new URL(request.url).searchParams;
    const state = params.get("state") || "";
    if (!value.state || state.length !== value.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(value.state)) ||
      value.binding !== sessionBinding(request) || !Number.isFinite(value.expires) || value.expires < Date.now() || value.expires > Date.now() + 600000 ||
      typeof value.verifier !== "string" || !params.get("code") || params.has("error")) throw new Error();
    return { code: params.get("code")!, verifier: value.verifier as string };
  } catch { throw new ExcelError("AUTH_FAILED", 400); }
}
export async function initializeExcelDatabase() {
  await db()`CREATE TABLE IF NOT EXISTS muza_excel_integration (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    refresh_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    web_url TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    pending_snapshot JSONB,
    last_synced_at TIMESTAMPTZ,
    lock_id UUID,
    locked_until TIMESTAMPTZ
  )`;
  await db()`ALTER TABLE muza_excel_integration ADD COLUMN IF NOT EXISTS pending_snapshot JSONB`;
}
async function tokenRequest(values: Record<string, string>) {
  const c = config();
  const response = await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, scope: SCOPE, ...values }),
    signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) throw new ExcelError("RECONNECT", 401);
  const result = await response.json();
  if (typeof result.access_token !== "string") throw new ExcelError("RECONNECT", 401);
  return result as { access_token: string; refresh_token?: string };
}
async function graph(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${GRAPH}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (response.status === 409 || response.status === 412 || response.status === 423) throw new ExcelError("EXCEL_CHANGED", 409);
  if (response.status === 401 || response.status === 403) throw new ExcelError("RECONNECT", 401);
  if (!response.ok) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  return response;
}
export function orderFields(order: Pick<Order, "status" | "adminNotes" | "shippingCost" | "trackingNumber">): Editable {
  return { status: order.status, adminNotes: order.adminNotes, shippingCost: order.shippingCost, trackingNumber: order.trackingNumber };
}
/** Merge only administrator fields. Concurrent edits to the same field must be resolved explicitly. */
export function mergeEditable(base: Editable, remote: Editable, current: Editable): Editable {
  const result = { ...current };
  for (const field of editable) {
    if (remote[field] === base[field]) continue;
    if (current[field] !== base[field] && current[field] !== remote[field]) throw new ExcelError("ORDER_CONFLICT", 409);
    Object.assign(result, { [field]: remote[field] });
  }
  return result;
}
function cellString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if ("richText" in value) return value.richText.map(part => part.text).join("");
  throw new ExcelError("INVALID_WORKBOOK");
}
export function sheetCells(workbook: ExcelJS.Workbook) {
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.name !== "Тапсырыстар" || workbook.worksheets.length > 2 ||
    (workbook.worksheets[1] && workbook.worksheets[1].name !== "Нұсқаулық") ||
    sheet.rowCount > 10001 || sheet.columnCount > 80) throw new ExcelError("INVALID_WORKBOOK");
  const headers = Array.from({ length: sheet.columnCount }, (_, i) => cellString(sheet.getRow(1).getCell(i + 1)));
  const rows: string[][] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = Array.from({ length: headers.length }, (_, j) => cellString(sheet.getRow(i).getCell(j + 1)));
    if (row.some(Boolean)) rows.push(row);
  }
  return { headers, rows };
}
async function exportState(orders: Order[]) {
  const workbook = await buildWorkbook(orders);
  const cells = sheetCells(workbook);
  if (cells.rows.length !== orders.length) throw new ExcelError("INVALID_WORKBOOK", 500);
  const snapshot: Snapshot = { headers: cells.headers, rows: orders.map((order, i) => ({ id: order.id, updatedAt: order.updatedAt, fields: orderFields(order), cells: cells.rows[i] })) };
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  if (bytes.length > MAX_FILE) throw new ExcelError("WORKBOOK_TOO_LARGE");
  return { snapshot, bytes };
}
export async function completeMicrosoftAuth(code: string, verifier: string) {
  const tokens = await tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: config().redirectUri });
  if (!tokens.refresh_token) throw new ExcelError("RECONNECT", 401);
  const state = await exportState(await listOrders());
  // A unique name avoids replacing any existing document in the user's OneDrive.
  const name = `Muza-orders-${Date.now()}-${randomBytes(4).toString("hex")}.xlsx`;
  const result = await graph(tokens.access_token, `/me/drive/root:/${name}:/content`, { method: "PUT", headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, body: new Uint8Array(state.bytes) });
  const item = await result.json();
  if (typeof item.id !== "string" || typeof item.webUrl !== "string" || !item.webUrl.startsWith("https://")) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  const sql = db();
  const saved = await sql`INSERT INTO muza_excel_integration(id,refresh_token,item_id,web_url,snapshot,last_synced_at)
    VALUES(1,${encryptSecret(tokens.refresh_token)},${item.id},${item.webUrl},${JSON.stringify(state.snapshot)}::jsonb,NOW())
    ON CONFLICT(id) DO UPDATE SET refresh_token=EXCLUDED.refresh_token,item_id=EXCLUDED.item_id,web_url=EXCLUDED.web_url,snapshot=EXCLUDED.snapshot,pending_snapshot=NULL,last_synced_at=NOW(),lock_id=NULL,locked_until=NULL
    WHERE muza_excel_integration.locked_until IS NULL OR muza_excel_integration.locked_until<NOW() RETURNING id`;
  if (!saved.length) throw new ExcelError("BUSY_OR_DISCONNECTED",409);
}
export async function excelStatus() {
  const rows = await db()`SELECT web_url,last_synced_at FROM muza_excel_integration WHERE id=1`;
  return { configured: microsoftConfigured(), connected: rows.length > 0, webUrl: rows[0]?.web_url || null, lastSyncedAt: rows[0]?.last_synced_at || null };
}
export const fieldHeaders: Record<keyof Editable, string> = { status: "Күйі", adminNotes: "Әкімші ескертпесі", shippingCost: "Жеткізу құны (₸)", trackingNumber: "Трек-нөмір" };
export function readChanges(workbook: ExcelJS.Workbook, snapshot: Snapshot, orders: Order[]) {
  const actual = sheetCells(workbook);
  if (JSON.stringify(actual.headers) !== JSON.stringify(snapshot.headers)) throw new ExcelError("INVALID_WORKBOOK");
  const idIndex = snapshot.headers.indexOf("Тапсырыс ID");
  const mutableIndices = Object.fromEntries(editable.map(field => [field, snapshot.headers.indexOf(fieldHeaders[field])])) as Record<keyof Editable, number>;
  if (idIndex < 0 || Object.values(mutableIndices).some(i => i < 0)) throw new ExcelError("INVALID_WORKBOOK");
  const baseline = new Map(snapshot.rows.map(row => [row.id, row]));
  const current = new Map(orders.map(order => [order.id, order]));
  const seen = new Set<string>();
  const updates: { id: string; expectedUpdatedAt: string; fields: Editable }[] = [];
  for (const cells of actual.rows) {
    const id = cells[idIndex], base = baseline.get(id), order = current.get(id);
    if (!base || !order || seen.has(id)) throw new ExcelError("INVALID_WORKBOOK");
    seen.add(id);
    for (let index = 0; index < cells.length; index++) {
      if (!Object.values(mutableIndices).includes(index) && cells[index] !== base.cells[index]) throw new ExcelError("READ_ONLY_CHANGED", 409);
    }
    // Formula injection was escaped at export; undo only the exact export prefix.
    const unescape = (value: string) => /^'(?:\s*[=+\-@]|[\t\r\n])/.test(value) ? value.slice(1) : value;
    const rawCost = cells[mutableIndices.shippingCost].trim();
    const parsed = adminUpdateSchema.safeParse({
      status: cells[mutableIndices.status], adminNotes: unescape(cells[mutableIndices.adminNotes]),
      shippingCost: rawCost === "" ? null : (/^\d+(?:\.\d{1,2})?$/.test(rawCost) ? Number(rawCost) : NaN),
      trackingNumber: unescape(cells[mutableIndices.trackingNumber]),
    });
    if (!parsed.success) throw new ExcelError("INVALID_WORKBOOK");
    const remote = parsed.data as Editable;
    // Normalization must not invent an edit when the exported cell was untouched.
    for (const field of editable) {
      if (cells[mutableIndices[field]] === base.cells[mutableIndices[field]]) Object.assign(remote, { [field]: base.fields[field] });
    }
    const fields = mergeEditable(base.fields, remote, orderFields(order));
    if (editable.some(field => fields[field] !== orderFields(order)[field])) updates.push({ id, expectedUpdatedAt: order.updatedAt, fields });
  }
  if (seen.size !== baseline.size) throw new ExcelError("DELETED_ROWS", 409);
  return updates;
}
/** Refuse compressed archives whose expanded size would exhaust a serverless process. */
export function validateXlsxArchive(bytes: Buffer) {
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new ExcelError("INVALID_WORKBOOK");
  const count = bytes.readUInt16LE(end + 10);
  let position = bytes.readUInt32LE(end + 16), total = 0;
  if (count > 1000 || position >= end) throw new ExcelError("INVALID_WORKBOOK");
  for (let i = 0; i < count; i++) {
    if (position + 46 > end || bytes.readUInt32LE(position) !== 0x02014b50) throw new ExcelError("INVALID_WORKBOOK");
    const size = bytes.readUInt32LE(position + 24);
    total += size;
    if (size > 15 * 1024 * 1024 || total > 40 * 1024 * 1024 || bytes.readUInt16LE(position + 8) & 1) throw new ExcelError("WORKBOOK_TOO_LARGE");
    position += 46 + bytes.readUInt16LE(position + 28) + bytes.readUInt16LE(position + 30) + bytes.readUInt16LE(position + 32);
  }
  if (position > end) throw new ExcelError("INVALID_WORKBOOK");
}
function matchesReadonly(workbook: ExcelJS.Workbook, snapshot: Snapshot) {
  const actual = sheetCells(workbook);
  if (JSON.stringify(actual.headers) !== JSON.stringify(snapshot.headers) || actual.rows.length !== snapshot.rows.length) return false;
  const idIndex = snapshot.headers.indexOf("Тапсырыс ID");
  const mutable = new Set(Object.values(fieldHeaders).map(header => snapshot.headers.indexOf(header)));
  const byId = new Map(snapshot.rows.map(row => [row.id, row]));
  const seen = new Set<string>();
  return actual.rows.every(cells => {
    const id = cells[idIndex], base = byId.get(id);
    if (!base || seen.has(id)) return false;
    seen.add(id);
    return cells.every((value, i) => mutable.has(i) || value === base.cells[i]);
  });
}
async function limitedBytes(response: Response) {
  if (Number(response.headers.get("content-length")) > MAX_FILE || !response.body) throw new ExcelError("WORKBOOK_TOO_LARGE");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > MAX_FILE) { await reader.cancel(); throw new ExcelError("WORKBOOK_TOO_LARGE"); }
    chunks.push(item.value);
  }
  return Buffer.concat(chunks);
}
async function download(token: string, itemId: string) {
  const metadata = await (await graph(token, `/me/drive/items/${encodeURIComponent(itemId)}?$select=id,eTag,size`)).json();
  if (metadata.size > MAX_FILE || typeof metadata.eTag !== "string") throw new ExcelError("WORKBOOK_TOO_LARGE");
  const response = await fetch(`${GRAPH}/me/drive/items/${encodeURIComponent(itemId)}/content`, { headers: { Authorization: `Bearer ${token}` }, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (response.status !== 302) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  const location = response.headers.get("location");
  if (!location) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  const url = new URL(location);
  if (url.protocol !== "https:" || !/(\.sharepoint\.com|\.1drv\.com|\.onedrive\.com)$/.test(url.hostname)) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  // Never forward Microsoft access tokens to the preauthenticated download URL.
  const content = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!content.ok) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  const bytes = await limitedBytes(content);
  const after = await (await graph(token, `/me/drive/items/${encodeURIComponent(itemId)}?$select=eTag`)).json();
  if (metadata.eTag !== after.eTag) throw new ExcelError("EXCEL_CHANGED", 409);
  return { bytes, eTag: metadata.eTag as string };
}
/** Graph documents If-Match on createUploadSession; uploads are never retried unconditionally. */
export async function uploadWorkbook(token: string, itemId: string, eTag: string, bytes: Buffer) {
  const created = await graph(token, `/me/drive/items/${encodeURIComponent(itemId)}/createUploadSession`, {
    method: "POST", headers: { "Content-Type": "application/json", "If-Match": eTag },
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "fail" } }),
  });
  const session = await created.json();
  if (typeof session.uploadUrl !== "string") throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  const uploadUrl = new URL(session.uploadUrl);
  if (uploadUrl.protocol !== "https:" || !/(\.sharepoint\.com|\.1drv\.com|\.onedrive\.com)$/.test(uploadUrl.hostname)) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  try {
    // The size limit is 5 MB, so the entire file fits one final range (Graph allows <60 MiB per range).
    // The preauthenticated upload URL must not receive the OAuth Authorization header.
    const uploaded = await fetch(uploadUrl, {
      method: "PUT", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length), "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` },
      body: new Uint8Array(bytes),
    });
    if ([409, 412, 423].includes(uploaded.status)) throw new ExcelError("EXCEL_CHANGED", 409);
    if (uploaded.status !== 200 && uploaded.status !== 201) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
    const item = await uploaded.json();
    if (item.id !== itemId) throw new ExcelError("MICROSOFT_UNAVAILABLE", 502);
  } catch (error) {
    // Cancel only this temporary upload session, never the user's file.
    await fetch(uploadUrl, { method: "DELETE", redirect: "error", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    throw error;
  }
}
/** One explicit two-way sync; there is no background polling or automatic synchronization. */
export async function syncExcel() {
  const sql = db(), lock = randomUUID();
  const rows = await sql`UPDATE muza_excel_integration SET lock_id=${lock}::uuid,locked_until=NOW()+INTERVAL '3 minutes'
    WHERE id=1 AND (locked_until IS NULL OR locked_until<NOW()) RETURNING *`;
  if (!rows.length) throw new ExcelError("BUSY_OR_DISCONNECTED", 409);
  try {
    const integration = rows[0];
    const token = await tokenRequest({ grant_type: "refresh_token", refresh_token: decryptSecret(integration.refresh_token) });
    if (token.refresh_token) await sql`UPDATE muza_excel_integration SET refresh_token=${encryptSecret(token.refresh_token)} WHERE id=1 AND lock_id=${lock}::uuid`;
    const downloaded = await download(token.access_token, integration.item_id);
    validateXlsxArchive(downloaded.bytes);
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(downloaded.bytes as unknown as ExcelJS.Buffer); }
    catch { throw new ExcelError("INVALID_WORKBOOK"); }
    const orders = await listOrders();
    // Recover if an upload succeeded but the subsequent database acknowledgement failed.
    const baseline = integration.pending_snapshot && !matchesReadonly(workbook, integration.snapshot as Snapshot) &&
      matchesReadonly(workbook, integration.pending_snapshot as Snapshot)
      ? integration.pending_snapshot as Snapshot : integration.snapshot as Snapshot;
    const updates = readChanges(workbook, baseline, orders);
    if (updates.length) {
      const records = updates.map(update => ({ id: update.id, expected: update.expectedUpdatedAt, ...update.fields }));
      // Single statement: all rows must still match the versions read above.
      const changed = await sql`WITH incoming AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb)
        AS x(id uuid,expected timestamptz,status text,"adminNotes" text,"shippingCost" numeric,"trackingNumber" text)
      ), locked AS MATERIALIZED (
        SELECT o.id,o.updated_at FROM muza_orders o JOIN incoming i ON o.id=i.id ORDER BY o.id FOR UPDATE OF o
      ), valid AS (
        SELECT NOT EXISTS(SELECT 1 FROM incoming i LEFT JOIN locked o ON o.id=i.id WHERE o.id IS NULL OR date_trunc('milliseconds',o.updated_at)<>i.expected) AS ok
      )
      UPDATE muza_orders o SET status=i.status,admin_notes=i."adminNotes",shipping_cost=i."shippingCost",tracking_number=i."trackingNumber",updated_at=date_trunc('milliseconds',clock_timestamp())
      FROM incoming i,valid v WHERE o.id=i.id AND v.ok RETURNING o.id`;
      if (changed.length !== updates.length) throw new ExcelError("ORDER_CONFLICT", 409);
    }
    const next = await exportState(await listOrders());
    await sql`UPDATE muza_excel_integration SET pending_snapshot=${JSON.stringify(next.snapshot)}::jsonb WHERE id=1 AND lock_id=${lock}::uuid`;
    await uploadWorkbook(token.access_token, integration.item_id, downloaded.eTag, next.bytes);
    await sql`UPDATE muza_excel_integration SET snapshot=${JSON.stringify(next.snapshot)}::jsonb,pending_snapshot=NULL,last_synced_at=NOW() WHERE id=1 AND lock_id=${lock}::uuid`;
    return { imported: updates.length, exported: next.snapshot.rows.length };
  } finally {
    await sql`UPDATE muza_excel_integration SET lock_id=NULL,locked_until=NULL WHERE id=1 AND lock_id=${lock}::uuid`;
  }
}
export function excelErrorResponse(error: unknown) {
  const code = error instanceof ExcelError ? error.code : "SERVICE_UNAVAILABLE";
  const messages: Record<string, string> = {
    NOT_CONFIGURED: "Microsoft 365 қосылымын техникалық маман баптауы керек.",
    RECONNECT: "Microsoft тіркелгісін қайта қосыңыз.",
    AUTH_FAILED: "Қосылу расталмады. Әкімші бетіне оралып, қайта бастаңыз.",
    EXCEL_CHANGED: "Excel файлы өзгерді немесе ашық тұр. Өзгерістерді сақтап, файлды жауып, қайта синхрондаңыз.",
    ORDER_CONFLICT: "Бір тапсырыс сайтта және Excel-де қатар өзгертілген. Өзгерістерді салыстырып, Excel ұяшығын сайттағы мәнмен сәйкестендіріңіз.",
    READ_ONLY_CHANGED: "Excel-де клиент деректері немесе техникалық баған өзгерген. Бұрынғы мәнді қалпына келтіріңіз.",
    DELETED_ROWS: "Excel жолдары жойылған. Жолдарды қалпына келтіріңіз; тапсырысты жою орнына cancelled күйін пайдаланыңыз.",
    INVALID_WORKBOOK: "Excel пішімі немесе мәндері дұрыс емес. Тек күй, ескертпе, жеткізу құны мен трек-нөмірді өзгертіңіз.",
    WORKBOOK_TOO_LARGE: "Excel файлы тым үлкен (шегі 5 МБ немесе 10 000 жол).",
    BUSY_OR_DISCONNECTED: "Қосылым жоқ немесе синхрондау орындалуда. Бірнеше минуттан кейін қайталаңыз.",
    MICROSOFT_UNAVAILABLE: "Microsoft қызметіне қосылу мүмкін болмады. Кейін қайталаңыз.",
    SERVICE_UNAVAILABLE: "Қызмет уақытша қолжетімсіз. Кейін қайталаңыз.",
  };
  return { code, error: messages[code] || messages.SERVICE_UNAVAILABLE, status: error instanceof ExcelError ? error.status : 503 };
}
