import { clientRateKey,createSessionToken,isSameOrigin,privateJson,readJson,SESSION_COOKIE,SESSION_SECONDS,SESSION_SAME_SITE,verifyPassword } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({error:"Сұрау көзі расталмады."},403);
  let body: unknown;
  try { body = await readJson(request,2048); } catch { return privateJson({error:"Сұрау пішімі дұрыс емес."},400); }
  const password = typeof body === "object" && body !== null && "password" in body ? body.password : null;
  if (typeof password !== "string" || !password || password.length>1024) return privateJson({error:"Құпиясөзді енгізіңіз."},400);
  const secret = process.env.SESSION_SECRET;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!secret || secret.length<32 || !hash) return privateJson({error:"Әкімші кіруі әлі бапталмаған."},503);
  try {
    if (!await consumeRateLimit(clientRateKey(request,"login"),8,900)) return privateJson({error:"Кіру әрекеті тым көп. 15 минуттан кейін қайталаңыз."},429);
    if (!await verifyPassword(password,hash)) return privateJson({error:"Құпиясөз дұрыс емес."},401);
    const response = privateJson({authenticated:true});
    const secure = process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
    response.headers.append("Set-Cookie",`${SESSION_COOKIE}=${createSessionToken(secret)}; Path=/; HttpOnly; SameSite=${SESSION_SAME_SITE}; Max-Age=${SESSION_SECONDS}${secure?"; Secure":""}`);
    return response;
  } catch {
    console.error("Admin authentication service unavailable");
    return privateJson({error:"Кіру қызметі уақытша қолжетімсіз."},503);
  }
}
