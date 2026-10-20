import { isAuthenticated, isSameOrigin, privateJson } from "@/lib/auth";
import { syncExcel, excelErrorResponse } from "@/lib/microsoft";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!isAuthenticated(request)) return privateJson({ error: "Кіру қажет." }, 401);
  if (!isSameOrigin(request)) return privateJson({ error: "Сұрауға рұқсат жоқ." }, 403);
  try { return privateJson(await syncExcel()); }
  catch (error) { const result = excelErrorResponse(error); return privateJson(result, result.status); }
}
