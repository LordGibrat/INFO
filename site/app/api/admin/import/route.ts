import { isAuthenticated, isSameOrigin, privateJson } from "@/lib/auth";
import { importWorkbook, importError, readWorkbookBody } from "@/lib/workbook-import";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!isAuthenticated(request)) return privateJson({ error: "Кіру қажет." }, 401);
  if (!isSameOrigin(request)) return privateJson({ error: "Сұрауға рұқсат жоқ." }, 403);
  try { return privateJson(await importWorkbook(await readWorkbookBody(request))); }
  catch (error) { const result = importError(error); return privateJson({ error: result.error, code: result.code }, result.status); }
}
