import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSessionToken } from "../lib/auth";
import { buildWorkbook } from "../lib/export";
import { mapOrder, type Order } from "../lib/orders";
import { applyWorkbookImport, loadImportWorkbook, MAX_IMPORT_BYTES, prepareWorkbookImport, readWorkbookBody, XLSX_CONTENT_TYPE } from "../lib/workbook-import";
import { POST } from "../app/api/admin/import/route";
import { db } from "../lib/db";
import { loadEnvConfig } from "@next/env";

const first: Order = {
  id: randomUUID(), reference: "MZ-MANUAL-TEST", name: "Айдана", phone: "+77012345678", service: "neon",
  event: "", eventDate: "", signText: "MUZA", color: "Ақ", details: "", deliveryMethod: "pickup",
  recipientName: "", recipientPhone: "", region: "", city: "", address: "", apartment: "", postalCode: "", consent: true,
  status: "new", adminNotes: "", shippingCost: null, trackingNumber: "",
  createdAt: "2026-10-20T00:00:00.000Z", updatedAt: "2026-10-20T00:00:00.000Z",
};
const second: Order = { ...first, id: randomUUID(), reference: "MZ-MANUAL-TEST-2" };
test("manual XLSX round-trip accepts four admin fields without Microsoft configuration", async () => {
  const workbook = await buildWorkbook([first]);
  const sheet = workbook.worksheets[0];
  sheet.getCell("E2").value = "shipped";
  sheet.getCell("V2").value = 2500;
  sheet.getCell("W2").value = "KZ123";
  sheet.getCell("X2").value = "Жіберілді";
  const parsed = await loadImportWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
  const updates = await prepareWorkbookImport(parsed, [first]);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    id: first.id, expectedUpdatedAt: first.updatedAt,
    fields: { status: "shipped", shippingCost: 2500, trackingNumber: "KZ123", adminNotes: "Жіберілді" },
  });
});
test("unchanged exports produce no database updates; absent rows never imply deletion", async () => {
  assert.deepEqual(await prepareWorkbookImport(await buildWorkbook([first]), [first, second]), []);
});
test("one stale edited row rejects the complete manual import plan", async () => {
  const workbook = await buildWorkbook([first, second]);
  workbook.worksheets[0].getCell("E2").value = "confirmed";
  workbook.worksheets[0].getCell("E3").value = "confirmed";
  await assert.rejects(prepareWorkbookImport(workbook, [first, { ...second, updatedAt: "2026-10-20T00:01:00.000Z" }]), /STALE_IMPORT/);
});
test("manual import rejects customer edits, duplicate/unknown rows, formulas and invalid status", async () => {
  for (const [cell, value, code] of [
    ["F2", "Changed customer", "READ_ONLY_CHANGED"],
    ["A2", randomUUID(), "INVALID_WORKBOOK"],
    ["E2", "paid", "INVALID_WORKBOOK"],
    ["V2", -5, "INVALID_WORKBOOK"],
    ["D2", "yesterday", "INVALID_WORKBOOK"],
    ["X2", { formula: "HYPERLINK(\"https://example.com\")", result: "click" }, "INVALID_WORKBOOK"],
  ] as const) {
    const workbook = await buildWorkbook([first]);
    workbook.worksheets[0].getCell(cell).value = value;
    await assert.rejects(prepareWorkbookImport(workbook, [first]), new RegExp(code));
  }
  const duplicate = await buildWorkbook([first, first]);
  await assert.rejects(prepareWorkbookImport(duplicate, [first]), /INVALID_WORKBOOK/);
});
test("manual import enforces MIME, streamed and advertised body limits", async () => {
  await assert.rejects(readWorkbookBody(new Request("https://muza.example/api/admin/import", { method: "POST", body: "not-xlsx" })), /XLSX_REQUIRED/);
  await assert.rejects(readWorkbookBody(new Request("https://muza.example/api/admin/import", {
    method: "POST", headers: { "Content-Type": XLSX_CONTENT_TYPE, "Content-Length": String(MAX_IMPORT_BYTES + 1) }, body: "x",
  })), /IMPORT_TOO_LARGE/);
  await assert.rejects(readWorkbookBody(new Request("https://muza.example/api/admin/import", {
    method: "POST", headers: { "Content-Type": XLSX_CONTENT_TYPE }, body: new Uint8Array(MAX_IMPORT_BYTES + 1),
  })), /IMPORT_TOO_LARGE/);
  await assert.rejects(loadImportWorkbook(Buffer.from("invalid archive")), /INVALID_WORKBOOK/);
});
test("manual import route enforces admin authentication and same-origin before parsing files", async () => {
  process.env.SESSION_SECRET = "manual-import-test-secret-longer-than-32-characters";
  process.env.SITE_URL = "https://muza.example";
  const url = "https://muza.example/api/admin/import";
  assert.equal((await POST(new Request(url, { method: "POST" }))).status, 401);
  const cookie = `muza_admin=${createSessionToken(process.env.SESSION_SECRET)}`;
  assert.equal((await POST(new Request(url, { method: "POST", headers: { cookie, origin: "https://attacker.example" } }))).status, 403);
  const response = await POST(new Request(url, {
    method: "POST", headers: { cookie, origin: "https://muza.example", "Content-Type": XLSX_CONTENT_TYPE }, body: "not a workbook",
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_WORKBOOK");
  assert.match(response.headers.get("Cache-Control") || "", /no-store/);
});
test("live DB manual import is atomic on stale rows and updates valid rows", { skip: process.env.RUN_DB_IMPORT_TESTS !== "1" }, async () => {
  loadEnvConfig(process.cwd());
  const sql = db(), ids = [randomUUID(), randomUUID()];
  try {
    const orders: Order[] = [];
    for (const id of ids) {
      const rows = await sql`INSERT INTO muza_orders(id,reference,idempotency_key,payload_hash,data)
        VALUES(${id}::uuid,${`IMPORT-TEST-${id}`},${id}::uuid,'manual-import-test',${JSON.stringify(first)}::jsonb) RETURNING *`;
      orders.push(mapOrder(rows[0]));
    }
    const updates = orders.map(order => ({
      id: order.id, expectedUpdatedAt: order.updatedAt,
      fields: { status: "confirmed" as const, adminNotes: "manual test", shippingCost: 1000, trackingNumber: "TEST" },
    }));
    await assert.rejects(applyWorkbookImport([{ ...updates[0] }, { ...updates[1], expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }]), /STALE_IMPORT/);
    const unchanged = await sql`SELECT status FROM muza_orders WHERE id IN (${ids[0]}::uuid,${ids[1]}::uuid)`;
    assert.ok(unchanged.every(row => row.status === "new"), "no partial update on stale batch");
    assert.equal(await applyWorkbookImport(updates), 2);
    const changed = await sql`SELECT status,admin_notes,shipping_cost FROM muza_orders WHERE id IN (${ids[0]}::uuid,${ids[1]}::uuid)`;
    assert.ok(changed.every(row => row.status === "confirmed" && row.admin_notes === "manual test" && Number(row.shipping_cost) === 1000));
    await assert.rejects(applyWorkbookImport(updates), /STALE_IMPORT/);
  } finally {
    await sql`DELETE FROM muza_orders WHERE id IN (${ids[0]}::uuid,${ids[1]}::uuid) AND payload_hash='manual-import-test'`;
  }
});
