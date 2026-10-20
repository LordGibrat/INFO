import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { db,consumeRateLimit,initializeDatabase } from "../lib/db";
import { createOrder,IdempotencyConflictError,updateOrder } from "../lib/orders";
import { orderSchema } from "../lib/validation";

loadEnvConfig(process.cwd());
test("live database persists once, protects idempotency and detects stale edits", {skip:process.env.RUN_DB_TESTS!=="1"},async () => {
  await initializeDatabase();
  const key = randomUUID();
  const input = orderSchema.parse({
    name:"Тест — жоюға болады",phone:"+77000000000",service:"canvas",consent:true,
    deliveryMethod:"kazpost",recipientName:"Тест",recipientPhone:"+77000000000",
    region:"Батыс Қазақстан",city:"Орал",address:"Тест көшесі, 1",postalCode:"090000",idempotencyKey:key,
  });
  const sql = db();
  try {
    const [a,b] = await Promise.all([createOrder(input),createOrder(input)]);
    assert.equal(a.id,b.id);
    assert.equal(a.reference,b.reference);
    await assert.rejects(()=>createOrder({...input,name:"Басқа тапсырыс"}),IdempotencyConflictError);
    const rows = await sql`SELECT * FROM muza_orders WHERE idempotency_key=${key}::uuid`;
    assert.equal(rows.length,1);
    assert.equal(rows[0].data.city,"Орал");
    const updated = await updateOrder(a.id,{status:"confirmed",shippingCost:2500,adminNotes:"Тексерілді"});
    assert.equal(updated?.status,"confirmed");
    assert.equal(updated?.shippingCost,2500);
    const version = await sql`SELECT updated_at, date_trunc('milliseconds',updated_at)::text AS precise_version FROM muza_orders WHERE id=${a.id}::uuid`;
    assert.equal(updated?.updatedAt,new Date(version[0].precise_version).toISOString(),"Serialized version must preserve milliseconds from PostgreSQL");
    assert.equal(await updateOrder(a.id,{status:"completed"},"2000-01-01T00:00:00.000Z"),null);
    assert.equal((await updateOrder(a.id,{trackingNumber:"TEST123"},updated!.updatedAt))?.trackingNumber,"TEST123");
  } finally {
    // Only removes the exact synthetic fixture created by this test run.
    await sql`DELETE FROM muza_orders WHERE idempotency_key=${key}::uuid`;
  }
});
test("live database rate limit is atomic across simultaneous serverless requests", {skip:process.env.RUN_DB_TESTS!=="1"},async () => {
  const key = `integration-test:${randomUUID()}`;
  const sql = db();
  try {
    const results = await Promise.all(Array.from({length:8},()=>consumeRateLimit(key,3,60)));
    assert.equal(results.filter(Boolean).length,3);
  } finally { await sql`DELETE FROM muza_rate_limits WHERE key=${key}`; }
});
