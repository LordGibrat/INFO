import { isAuthenticated, isSameOrigin, privateJson } from "@/lib/auth";
import { beginMicrosoftAuth, EXCEL_COOKIE, excelErrorResponse } from "@/lib/microsoft";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAuthenticated(request)) return privateJson({ error: "Кіру қажет." }, 401);
  if (!isSameOrigin(request)) return privateJson({ error: "Сұрауға рұқсат жоқ." }, 403);
  try {
    const auth = beginMicrosoftAuth(request);
    const response = privateJson({ url: auth.url });
    response.headers.set("Set-Cookie", `${EXCEL_COOKIE}=${auth.cookie}; HttpOnly; SameSite=Lax; Path=/api/admin/excel; Max-Age=600${process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
    return response;
  } catch (error) { const result = excelErrorResponse(error); return privateJson(result, result.status); }
}
