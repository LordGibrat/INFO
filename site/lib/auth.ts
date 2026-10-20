import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export const SESSION_COOKIE = "muza_admin";
export const SESSION_SECONDS = 8 * 60 * 60;
// Lax permits Microsoft's top-level OAuth callback; mutations still require Origin.
export const SESSION_SAME_SITE = "Lax";
export async function hashPassword(password: string) {
  const salt = randomBytes(32).toString("hex");
  const key = await derive(password,salt,64) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm,salt,expected,...extra] = storedHash.split("$");
  if (extra.length || algorithm !== "scrypt" || !/^[a-f0-9]{64}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(expected ?? "")) return false;
  const actual = await derive(password,salt,64) as Buffer;
  return timingSafeEqual(actual,Buffer.from(expected,"hex"));
}
export function createSessionToken(secret: string, now = Math.floor(Date.now()/1000)) {
  if (secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  const payload = Buffer.from(JSON.stringify({exp:now+SESSION_SECONDS,nonce:randomBytes(16).toString("hex")})).toString("base64url");
  const signature = createHmac("sha256",secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
export function verifySessionToken(token: string, secret: string, now = Math.floor(Date.now()/1000)) {
  if (secret.length < 32 || token.length>1024) return false;
  const [payload,signature,...extra] = token.split(".");
  if (!payload || !signature || extra.length || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
  const expected = createHmac("sha256",secret).update(payload).digest();
  const actual = Buffer.from(signature,"base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    return Number.isInteger(value.exp) && value.exp > now && value.exp <= now+SESSION_SECONDS && typeof value.nonce === "string";
  } catch { return false; }
}
export function isAuthenticated(request: Request) {
  const raw = request.headers.get("cookie")?.split(";").map(part=>part.trim()).find(part=>part.startsWith(`${SESSION_COOKIE}=`));
  const token = raw?.slice(SESSION_COOKIE.length+1) ?? "";
  return verifySessionToken(token,process.env.SESSION_SECRET ?? "");
}
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    if (supplied.origin !== origin || !["http:","https:"].includes(supplied.protocol)) return false;
    if (process.env.NODE_ENV === "production") {
      // Vercel may normalize request.url internally. Only deployment-controlled
      // origins are trusted; neither Host nor forwarded headers grant access.
      const configured = [
        process.env.SITE_URL,
        ...[process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL,process.env.VERCEL_BRANCH_URL]
          .filter(Boolean).map(host=>`https://${host}`),
      ].filter((value):value is string=>!!value);
      return configured.some(value=>{
        try { return new URL(value).origin === supplied.origin; } catch { return false; }
      });
    }
    const target = new URL(request.url);
    if (supplied.origin === target.origin) return true;
    const loopback = new Set(["localhost","127.0.0.1","[::1]"]);
    return loopback.has(supplied.hostname) && loopback.has(target.hostname)
      && supplied.protocol === target.protocol && supplied.port === target.port;
  } catch { return false; }
}
export function privateJson(data: unknown,status=200) {
  return Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
}
export function clientRateKey(request: Request, scope: string) {
  // Vercel supplies and overwrites this header on production deployments.
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length<32) throw new Error("SESSION_SECRET is missing");
  return `${scope}:${createHmac("sha256",secret).update(ip).digest("hex")}`;
}
export async function readJson(request: Request, maxBytes=20000): Promise<unknown> {
  if (Number(request.headers.get("content-length") || "0")>maxBytes) throw new Error("BODY_TOO_LARGE");
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("INVALID_JSON");
  if (!request.body) throw new Error("INVALID_JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size>maxBytes) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("INVALID_JSON"); }
}
