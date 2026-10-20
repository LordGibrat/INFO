import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";
import type { OrderInput, AdminUpdate } from "./validation";

export type Order = Omit<OrderInput,"website"|"idempotencyKey"> & {
  id: string; reference: string; status: NonNullable<AdminUpdate["status"]>;
  adminNotes: string; shippingCost: number|null; trackingNumber: string;
  createdAt: string; updatedAt: string;
};
type Row = Record<string, unknown>;
function isoTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}
export function mapOrder(row: Row): Order {
  return {
    ...(row.data as Omit<OrderInput,"website"|"idempotencyKey">),
    id: String(row.id), reference: String(row.reference), status: row.status as Order["status"],
    adminNotes: String(row.admin_notes ?? ""), shippingCost: row.shipping_cost == null ? null : Number(row.shipping_cost),
    trackingNumber: String(row.tracking_number ?? ""),
    createdAt: isoTimestamp(row.created_at), updatedAt: isoTimestamp(row.updated_at),
  };
}
export class IdempotencyConflictError extends Error {}
export async function createOrder(input: OrderInput): Promise<{id:string;reference:string}> {
  const {website: _website,idempotencyKey,...data} = input;
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const id = randomUUID();
  const reference = `MZ-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${id.slice(0,8).toUpperCase()}`;
  const sql = db();
  const rows = await sql`
    INSERT INTO muza_orders (id,reference,idempotency_key,payload_hash,data)
    VALUES (${id},${reference},${idempotencyKey},${hash},${JSON.stringify(data)}::jsonb)
    ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
    RETURNING id,reference,payload_hash`;
  if (rows[0].payload_hash !== hash) throw new IdempotencyConflictError("Idempotency key reused with different data");
  return {id:String(rows[0].id),reference:String(rows[0].reference)};
}
export async function listOrders(): Promise<Order[]> {
  const sql = db();
  const rows = await sql`SELECT * FROM muza_orders ORDER BY created_at DESC LIMIT 10000`;
  return rows.map(mapOrder);
}
/** Optional expectedUpdatedAt provides optimistic concurrency for Excel sync. */
export async function updateOrder(id: string, patch: AdminUpdate, expectedUpdatedAt?: string): Promise<Order|null> {
  const sql = db();
  const rows = await sql`
    UPDATE muza_orders SET
      status = CASE WHEN ${patch.status !== undefined} THEN ${patch.status ?? null} ELSE status END,
      admin_notes = CASE WHEN ${patch.adminNotes !== undefined} THEN ${patch.adminNotes ?? null} ELSE admin_notes END,
      shipping_cost = CASE WHEN ${patch.shippingCost !== undefined} THEN ${patch.shippingCost ?? null} ELSE shipping_cost END,
      tracking_number = CASE WHEN ${patch.trackingNumber !== undefined} THEN ${patch.trackingNumber ?? null} ELSE tracking_number END,
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND (${expectedUpdatedAt ?? null}::timestamptz IS NULL OR date_trunc('milliseconds',updated_at) = ${expectedUpdatedAt ?? null}::timestamptz)
    RETURNING *`;
  return rows[0] ? mapOrder(rows[0]) : null;
}
