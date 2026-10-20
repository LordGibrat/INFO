import { isAuthenticated } from "@/lib/auth";
import { completeMicrosoftAuth, EXCEL_COOKIE, validateMicrosoftCallback, excelErrorResponse } from "@/lib/microsoft";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const redirect = new URL("/admin", process.env.SITE_URL || new URL(request.url).origin);
  try {
    if (!isAuthenticated(request)) throw new Error("Unauthenticated");
    const auth = validateMicrosoftCallback(request);
    await completeMicrosoftAuth(auth.code, auth.verifier);
    redirect.searchParams.set("excel", "connected");
  } catch (error) {
    redirect.searchParams.set("excel", excelErrorResponse(error).code.toLowerCase());
  }
  return new Response(null, { status: 303, headers: {
    Location: redirect.toString(), "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer",
    "Set-Cookie": `${EXCEL_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/admin/excel; Max-Age=0${process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  } });
}
