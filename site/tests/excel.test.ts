import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beginMicrosoftAuth, decryptSecret, encryptSecret, EXCEL_COOKIE, mergeEditable, orderFields, readChanges, uploadWorkbook, validateMicrosoftCallback, validateXlsxArchive } from "../lib/microsoft";
import { buildWorkbook } from "../lib/export";
import type { Order } from "../lib/orders";

const order: Order = {
  id: randomUUID(), reference: "MZ-TEST", name: "Айдана", phone: "+77012345678", service: "neon",
  event: "", eventDate: "", signText: "MUZA", color: "Ақ", details: "", deliveryMethod: "kazpost",
  recipientName: "Айдана", recipientPhone: "+77012345678", region: "Батыс Қазақстан", city: "Орал",
  address: "Достық 1", apartment: "", postalCode: "090000", consent: true,
  status: "new", adminNotes: "", shippingCost: null, trackingNumber: "",
  createdAt: "2026-10-20T00:00:00.000Z", updatedAt: "2026-10-20T00:00:00.000Z",
};
async function fixture(value: Order = order) {
  const workbook = await buildWorkbook([value]);
  const sheet = workbook.worksheets[0];
  const cells = (row: number) => Array.from({ length: sheet.columnCount }, (_, i) => String(sheet.getRow(row).getCell(i + 1).value ?? ""));
  return { workbook, sheet, snapshot: { headers: cells(1), rows: [{ id: value.id, updatedAt: value.updatedAt, fields: orderFields(value), cells: cells(2) }] } };
}
test("Excel three-way merge preserves independent DB edits", () => {
  const base = orderFields(order);
  assert.deepEqual(mergeEditable(base, { ...base, trackingNumber: "KZ123" }, { ...base, status: "confirmed" }),
    { ...base, trackingNumber: "KZ123", status: "confirmed" });
});
test("Excel conflicting changes to the same field are rejected", () => {
  const base = orderFields(order);
  assert.throws(() => mergeEditable(base, { ...base, status: "shipped" }, { ...base, status: "cancelled" }), /ORDER_CONFLICT/);
  assert.equal(mergeEditable(base, { ...base, status: "shipped" }, { ...base, status: "shipped" }).status, "shipped");
});
test("Workbook imports only approved admin fields", async () => {
  const { workbook, sheet, snapshot } = await fixture();
  sheet.getCell("E2").value = "confirmed";
  sheet.getCell("V2").value = 2500;
  const updates = readChanges(workbook, snapshot, [order]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].fields.status, "confirmed");
  assert.equal(updates[0].fields.shippingCost, 2500);
  assert.equal(updates[0].expectedUpdatedAt, order.updatedAt);
});
test("Customer data edits are rejected", async () => {
  const { workbook, sheet, snapshot } = await fixture();
  sheet.getCell("F2").value = "Changed name";
  assert.throws(() => readChanges(workbook, snapshot, [order]), /READ_ONLY_CHANGED/);
});
test("Invalid values and formulas are rejected", async () => {
  const { workbook, sheet, snapshot } = await fixture();
  sheet.getCell("V2").value = -1;
  assert.throws(() => readChanges(workbook, snapshot, [order]), /INVALID_WORKBOOK/);
  sheet.getCell("V2").value = null;
  sheet.getCell("X2").value = { formula: "1+1", result: 2 };
  assert.throws(() => readChanges(workbook, snapshot, [order]), /INVALID_WORKBOOK/);
});
test("Missing, duplicate and unknown rows cannot delete or insert customer orders", async () => {
  const a = await fixture();
  a.sheet.spliceRows(2, 1);
  assert.throws(() => readChanges(a.workbook, a.snapshot, [order]), /DELETED_ROWS/);
  const b = await fixture();
  b.sheet.addRow(b.sheet.getRow(2).values);
  assert.throws(() => readChanges(b.workbook, b.snapshot, [order]), /INVALID_WORKBOOK/);
  const c = await fixture();
  c.sheet.getCell("A2").value = randomUUID();
  assert.throws(() => readChanges(c.workbook, c.snapshot, [order]), /INVALID_WORKBOOK/);
});
test("Escaped formula-like admin text round-trips without a spurious update", async () => {
  const value = { ...order, adminNotes: " =literal", trackingNumber: "+123" };
  const { workbook, snapshot } = await fixture(value);
  assert.deepEqual(readChanges(workbook, snapshot, [value]), []);
});
test("Valid XLSX is accepted; malformed and expanded-size abuse are rejected", async () => {
  const workbook = await buildWorkbook([order]);
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  assert.doesNotThrow(() => validateXlsxArchive(bytes));
  assert.throws(() => validateXlsxArchive(Buffer.from("not a zip")), /INVALID_WORKBOOK/);
  const abused = Buffer.from(bytes);
  const central = abused.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  abused.writeUInt32LE(100_000_000, central + 24);
  assert.throws(() => validateXlsxArchive(abused), /WORKBOOK_TOO_LARGE/);
});
test("Token encryption is authenticated and randomized", () => {
  process.env.SESSION_SECRET = "test-secret-which-is-over-thirty-two-characters";
  const first = encryptSecret("refresh-token"), second = encryptSecret("refresh-token");
  assert.notEqual(first, second);
  assert.equal(decryptSecret(first), "refresh-token");
  const corrupt = Buffer.from(first, "base64url");
  corrupt[corrupt.length - 1] ^= 1;
  assert.throws(() => decryptSecret(corrupt.toString("base64url")));
});
test("OAuth callback requires matching state and original administrator session", () => {
  process.env.SESSION_SECRET = "test-secret-which-is-over-thirty-two-characters";
  process.env.MICROSOFT_CLIENT_ID = "test-client";
  process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
  process.env.SITE_URL = "https://muza.example";
  const original = new Request("https://muza.example/api/admin/excel/connect", { headers: { cookie: "muza_admin=admin-session-one" } });
  const auth = beginMicrosoftAuth(original);
  const url = new URL(auth.url);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("redirect_uri"), "https://muza.example/api/admin/excel/callback");
  const callback = `https://muza.example/api/admin/excel/callback?code=code&state=${url.searchParams.get("state")}`;
  const headers = { cookie: `muza_admin=admin-session-one; ${EXCEL_COOKIE}=${auth.cookie}` };
  assert.equal(validateMicrosoftCallback(new Request(callback, { headers })).code, "code");
  assert.throws(() => validateMicrosoftCallback(new Request(callback.replace("state=", "state=wrong"), { headers })), /AUTH_FAILED/);
  assert.throws(() => validateMicrosoftCallback(new Request(callback, { headers: { cookie: headers.cookie.replace("admin-session-one", "admin-session-two") } })), /AUTH_FAILED/);
  const expired = JSON.parse(decryptSecret(auth.cookie));
  expired.expires = Date.now() - 1000;
  assert.throws(() => validateMicrosoftCallback(new Request(callback, { headers: { cookie: `muza_admin=admin-session-one; ${EXCEL_COOKIE}=${encryptSecret(JSON.stringify(expired))}` } })), /AUTH_FAILED/);
});
test("Conditional upload session uses If-Match and never forwards OAuth credentials to upload URL", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return calls.length === 1 ? Response.json({ uploadUrl: "https://example.sharepoint.com/upload-session" }) : Response.json({ id: "item-one" }, { status: 201 });
  }) as typeof fetch;
  try {
    await uploadWorkbook("private-token", "item-one", '"version-one"', Buffer.from("test"));
    assert.match(calls[0].url, /\/item-one\/createUploadSession$/);
    assert.equal(new Headers(calls[0].init?.headers).get("If-Match"), '"version-one"');
    assert.equal(JSON.parse(calls[0].init?.body as string).item["@microsoft.graph.conflictBehavior"], "fail");
    assert.equal(new Headers(calls[1].init?.headers).get("Authorization"), null);
    assert.equal(new Headers(calls[1].init?.headers).get("Content-Range"), "bytes 0-3/4");
  } finally { globalThis.fetch = originalFetch; }
});
test("A stale upload eTag aborts before transferring any workbook content", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(null, { status: 412 }); }) as typeof fetch;
  try {
    await assert.rejects(uploadWorkbook("private-token", "item-one", '"old-version"', Buffer.from("test")), /EXCEL_CHANGED/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});
