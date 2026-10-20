import { z } from "zod";
import { isAuthenticated,isSameOrigin,privateJson,readJson } from "@/lib/auth";
import { updateOrder } from "@/lib/orders";
import { adminUpdateRequestSchema } from "@/lib/validation";
export async function PATCH(request: Request,context: {params:Promise<{id:string}>}) {
  if (!isAuthenticated(request)) return privateJson({error:"Алдымен кіріңіз."},401);
  if (!isSameOrigin(request)) return privateJson({error:"Сұрау көзі расталмады."},403);
  const {id} = await context.params;
  if (!z.uuid().safeParse(id).success) return privateJson({error:"Тапсырыс табылмады."},404);
  let body:unknown;
  try { body = await readJson(request); } catch { return privateJson({error:"Сұрау пішімі дұрыс емес."},400); }
  const parsed = adminUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return privateJson({error:"Күйді, жеткізу құнын және ескертпені тексеріңіз."},400);
  try {
    const {updatedAt,...patch} = parsed.data;
    const order = await updateOrder(id,patch,updatedAt);
    if (!order) return privateJson({error:updatedAt ? "Тапсырыс басқа жерден өзгертілді. Тізімді жаңартып, қайталаңыз." : "Тапсырыс табылмады."},updatedAt?409:404);
    return privateJson({order});
  } catch { return privateJson({error:"Өзгерістер сақталмады. Қайталап көріңіз."},503); }
}
