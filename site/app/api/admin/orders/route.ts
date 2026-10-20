import { isAuthenticated,privateJson } from "@/lib/auth";
import { listOrders } from "@/lib/orders";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isAuthenticated(request)) return privateJson({error:"Алдымен кіріңіз."},401);
  try { return privateJson({orders:await listOrders()}); }
  catch { return privateJson({error:"Тапсырыстарды жүктеу мүмкін болмады."},503); }
}
