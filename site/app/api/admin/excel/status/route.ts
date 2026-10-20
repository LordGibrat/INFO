import { isAuthenticated, privateJson } from "@/lib/auth";
import { excelStatus, excelErrorResponse } from "@/lib/microsoft";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!isAuthenticated(request)) return privateJson({ error: "Кіру қажет." }, 401);
  try { return privateJson(await excelStatus()); }
  catch (error) { const result = excelErrorResponse(error); return privateJson(result, result.status); }
}
