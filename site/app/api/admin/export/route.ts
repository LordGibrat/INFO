import { isAuthenticated,privateJson } from "@/lib/auth";
import { listOrders } from "@/lib/orders";
import { buildWorkbook } from "@/lib/export";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isAuthenticated(request)) return privateJson({error:"Алдымен кіріңіз."},401);
  try {
    const workbook = await buildWorkbook(await listOrders());
    const bytes = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(bytes),{headers:{
      "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":`attachment; filename="muza-orders-${new Date().toISOString().slice(0,10)}.xlsx"`,
      "Cache-Control":"no-store, private",
      "X-Content-Type-Options":"nosniff",
    }});
  } catch { return privateJson({error:"Excel файлын жасау мүмкін болмады."},503); }
}
