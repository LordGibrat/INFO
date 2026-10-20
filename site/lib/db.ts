import { neon } from "@neondatabase/serverless";

export class ServiceUnavailableError extends Error {
  constructor() { super("Service unavailable"); this.name = "ServiceUnavailableError"; }
}
/** Obtain a parameterized Neon SQL client. No in-memory persistence fallback. */
export function db() {
  if (!process.env.DATABASE_URL) throw new ServiceUnavailableError();
  return neon(process.env.DATABASE_URL);
}
export async function initializeDatabase() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS muza_orders (
    id UUID PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    idempotency_key UUID NOT NULL UNIQUE,
    payload_hash TEXT NOT NULL,
    data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','confirmed','production','ready','shipped','completed','cancelled')),
    admin_notes TEXT NOT NULL DEFAULT '',
    shipping_cost NUMERIC(12,2) CHECK (shipping_cost >= 0),
    tracking_number TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS muza_orders_created_idx ON muza_orders (created_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS muza_rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS muza_rate_limits_expiry_idx ON muza_rate_limits (expires_at)`;
}
/** Shared across serverless instances; one atomic counter increment per attempt. */
export async function consumeRateLimit(key: string, limit: number, seconds: number) {
  const sql = db();
  const rows = await sql`
    INSERT INTO muza_rate_limits (key, attempts, expires_at)
    VALUES (${key}, 1, NOW() + (${seconds} * INTERVAL '1 second'))
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN muza_rate_limits.expires_at <= NOW() THEN 1 ELSE muza_rate_limits.attempts + 1 END,
      expires_at = CASE WHEN muza_rate_limits.expires_at <= NOW() THEN NOW() + (${seconds} * INTERVAL '1 second') ELSE muza_rate_limits.expires_at END
    RETURNING attempts`;
  // Bounded housekeeping avoids keeping old hashed IP buckets indefinitely.
  if (Math.random()<0.02) {
    await sql`DELETE FROM muza_rate_limits WHERE key IN (
      SELECT key FROM muza_rate_limits WHERE expires_at < NOW() - INTERVAL '1 day'
      ORDER BY expires_at LIMIT 100
    )`;
  }
  return Number(rows[0].attempts) <= limit;
}
