import test from "node:test";
import assert from "node:assert/strict";
import { orderSchema, adminUpdateSchema, adminUpdateRequestSchema } from "../lib/validation";
import { createSessionToken, verifySessionToken, hashPassword, verifyPassword, isSameOrigin } from "../lib/auth";
import { safeExcelText, buildWorkbook } from "../lib/export";
import { GET as getOrders } from "../app/api/admin/orders/route";
import { GET as getExport } from "../app/api/admin/export/route";
import { PATCH as patchOrder } from "../app/api/admin/orders/[id]/route";
import { POST as postOrder } from "../app/api/orders/route";
import { POST as logout } from "../app/api/admin/logout/route";
import { readJson } from "../lib/auth";

const base = { name: "Әсел Мұрат", phone: "+7 (707) 452-88-42", service: "neon", deliveryMethod: "pickup", consent: true, idempotencyKey: "a6402648-0799-41e3-a710-2e34bca63994" };

test("accepts Kazakh text and normalizes Kazakhstan phone", () => {
  const order = orderSchema.parse(base);
  assert.equal(order.name, "Әсел Мұрат");
  assert.equal(order.phone, "+77074528842");
});
test("requires consent and rejects malformed or past event dates", () => {
  for (const patch of [{consent:false}, {eventDate:"2027-02-30"}, {eventDate:"2000-01-01"}, {phone:"123"}]) {
    assert.equal(orderSchema.safeParse({...base,...patch}).success, false);
  }
});
test("Kazpost requires complete address and cannot ship event installation", () => {
  assert.equal(orderSchema.safeParse({...base,deliveryMethod:"kazpost"}).success,false);
  const shipping = {...base,deliveryMethod:"kazpost",recipientName:"Әсел Мұрат",recipientPhone:"87074528842",region:"Батыс Қазақстан",city:"Орал",address:"Абай көшесі, 12",postalCode:"090000"};
  assert.equal(orderSchema.safeParse(shipping).success,true);
  assert.equal(orderSchema.safeParse({...shipping,service:"event"}).success,false);
  assert.equal(orderSchema.safeParse({...shipping,postalCode:"123"}).success,false);
  assert.equal(orderSchema.safeParse({...shipping,address:""}).success,false);
});
test("admin changes reject unsupported fields, invalid money and status", () => {
  assert.equal(adminUpdateSchema.safeParse({status:"shipped", shippingCost:3000, trackingNumber:"KZ123"}).success,true);
  for (const value of [{status:"paid"}, {shippingCost:-2}, {adminNotes:"x",name:"tampered"}, {}]) {
    assert.equal(adminUpdateSchema.safeParse(value).success,false);
  }
});
test("admin request validates optimistic timestamp without treating it as a data change", () => {
  assert.equal(adminUpdateRequestSchema.safeParse({status:"contacted",updatedAt:"2026-10-20T10:00:00.000Z"}).success,true);
  assert.equal(adminUpdateRequestSchema.safeParse({status:"contacted",updatedAt:"yesterday"}).success,false);
  assert.equal(adminUpdateRequestSchema.safeParse({updatedAt:"2026-10-20T10:00:00.000Z"}).success,false);
});
test("Oral delivery requires recipient and usable address", () => {
  const value = {...base,deliveryMethod:"oral",city:"Орал",address:"Абай көшесі, 12"};
  assert.equal(orderSchema.safeParse(value).success,false);
  assert.equal(orderSchema.safeParse({...value,recipientName:base.name,recipientPhone:base.phone}).success,true);
});
test("admin password is salted, timing-safe checked and fail closed", async () => {
  const hash = await hashPassword("not-a-real-admin-password");
  assert.equal(await verifyPassword("not-a-real-admin-password",hash),true);
  assert.equal(await verifyPassword("wrong",hash),false);
  assert.equal(await verifyPassword("password","malformed"),false);
});
test("sessions reject tampering, expiration and missing secret", () => {
  const secret = "a".repeat(48);
  const token = createSessionToken(secret,1000);
  assert.equal(verifySessionToken(token,secret,1001),true);
  assert.equal(verifySessionToken(token+"x",secret,1001),false);
  assert.equal(verifySessionToken(token,secret,1000+8*60*60+1),false);
  assert.equal(verifySessionToken(token,"",1001),false);
  assert.equal(verifySessionToken("",secret,1001),false);
});
test("state changing routes require matching origin", () => {
  assert.equal(isSameOrigin(new Request("https://example.kz/api/orders",{headers:{origin:"https://example.kz"}})),true);
  assert.equal(isSameOrigin(new Request("https://example.kz/api/orders",{headers:{origin:"https://attacker.kz"}})),false);
  assert.equal(isSameOrigin(new Request("https://example.kz/api/orders")),false);
});
test("development accepts Next loopback hostname normalization but rejects other ports and hosts", () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env,{NODE_ENV:"development"});
  try {
    assert.equal(isSameOrigin(new Request("http://localhost:3100/api/orders",{headers:{origin:"http://127.0.0.1:3100"}})),true);
    assert.equal(isSameOrigin(new Request("http://localhost:3100/api/orders",{headers:{origin:"http://127.0.0.1:9000"}})),false);
    assert.equal(isSameOrigin(new Request("http://localhost:3100/api/orders",{headers:{origin:"https://attacker.kz"}})),false);
  } finally { if (previous) Object.assign(process.env,{NODE_ENV:previous}); else Reflect.deleteProperty(process.env,"NODE_ENV"); }
});
test("production trusts configured origins, not arbitrary request hosts", () => {
  const previous = {NODE_ENV:process.env.NODE_ENV,SITE_URL:process.env.SITE_URL,VERCEL_URL:process.env.VERCEL_URL,VERCEL_PROJECT_PRODUCTION_URL:process.env.VERCEL_PROJECT_PRODUCTION_URL,VERCEL_BRANCH_URL:process.env.VERCEL_BRANCH_URL};
  Object.assign(process.env,{NODE_ENV:"production",SITE_URL:"https://muza.example",VERCEL_URL:"muza-preview.vercel.app"});
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;delete process.env.VERCEL_BRANCH_URL;
  try {
    assert.equal(isSameOrigin(new Request("https://internal.vercel.app/api/orders",{headers:{origin:"https://muza.example"}})),true);
    assert.equal(isSameOrigin(new Request("https://internal.vercel.app/api/orders",{headers:{origin:"https://muza-preview.vercel.app"}})),true);
    assert.equal(isSameOrigin(new Request("https://attacker.kz/api/orders",{headers:{origin:"https://attacker.kz"}})),false);
    assert.equal(isSameOrigin(new Request("http://localhost:3100/api/orders",{headers:{origin:"http://127.0.0.1:3100"}})),false);
  } finally { for (const [key,value] of Object.entries(previous)) {if(value)process.env[key]=value;else delete process.env[key];} }
});
test("Excel cells cannot turn customer text into spreadsheet formulas", () => {
  for (const value of ["=HYPERLINK(\"bad\")","+123","-123","@SUM(A1)","\t=1"," \n=1"]) {
    assert.equal(safeExcelText(value).startsWith("'"),true);
  }
  assert.equal(safeExcelText("Әсел — Орал"),"Әсел — Орал");
});
test("private endpoints reject anonymous requests before any database access", async () => {
  const request = new Request("https://example.kz/api/admin/orders");
  for (const response of [
    await getOrders(request), await getExport(request),
    await patchOrder(request,{params:Promise.resolve({id:base.idempotencyKey})}),
  ]) {
    assert.equal(response.status,401);
    assert.match(response.headers.get("cache-control") ?? "",/no-store/);
    assert.equal("orders" in await response.json(),false);
  }
});
test("orders cannot report success without configured persistence", async () => {
  const old = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const request = new Request("https://example.kz/api/orders",{
      method:"POST",headers:{"Content-Type":"application/json",Origin:"https://example.kz"},body:JSON.stringify(base),
    });
    const response = await postOrder(request);
    assert.equal(response.status,503);
    const body = await response.json();
    assert.equal("id" in body,false);
    assert.equal(typeof body.error,"string");
  } finally { if (old) process.env.DATABASE_URL=old; }
});
test("streamed requests are size limited even without content-length", async () => {
  const request = new Request("https://example.kz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:"x".repeat(3000)})});
  await assert.rejects(()=>readJson(request,100),/BODY_TOO_LARGE/);
});
test("logout clears the same secure OAuth-compatible admin cookie", async () => {
  const response = await logout(new Request("https://example.kz/api/admin/logout",{method:"POST",headers:{Origin:"https://example.kz"}}));
  assert.equal(response.status,200);
  const cookie = response.headers.get("set-cookie") ?? "";
  for (const expected of ["muza_admin=","Max-Age=0","SameSite=Lax","HttpOnly","Secure"]) assert.ok(cookie.includes(expected));
});
test("Excel export keeps stable synchronization fields hidden", async () => {
  const workbook = await buildWorkbook([]);
  const sheet = workbook.getWorksheet("Тапсырыстар")!;
  assert.equal(sheet.getColumn(1).hidden,true);
  assert.equal(sheet.getColumn(4).hidden,true);
  assert.equal(sheet.getCell("E2").dataValidation.type,"list");
  assert.ok(workbook.getWorksheet("Нұсқаулық"));
  const data = await workbook.xlsx.writeBuffer();
  assert.ok(data.byteLength>1000);
});
