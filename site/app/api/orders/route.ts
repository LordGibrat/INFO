import { orderSchema } from "@/lib/validation";
import { clientRateKey,isSameOrigin,privateJson,readJson } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/db";
import { createOrder,IdempotencyConflictError } from "@/lib/orders";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({error:"Сұрау көзі расталмады. Бетті жаңартыңыз."},403);
  let body: unknown;
  try { body = await readJson(request); } catch { return privateJson({error:"Сұрау пішімі дұрыс емес."},400); }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return privateJson({error:parsed.error.issues[0]?.message || "Деректерді тексеріңіз."},400);
  try {
    if (!await consumeRateLimit(clientRateKey(request,"order"),10,3600)) return privateJson({error:"Тым көп сұрау жіберілді. Кейінірек қайталаңыз немесе телефон соғыңыз."},429);
    const created = await createOrder(parsed.data);
    return privateJson(created,201);
  } catch (error) {
    if (error instanceof IdempotencyConflictError) return privateJson({error:"Бұл сұрау бұрын басқа деректермен жіберілген. Бетті жаңартыңыз."},409);
    console.error("Order persistence unavailable");
    return privateJson({error:"Тапсырыс сақталмады. Кейінірек қайталаңыз немесе +7 707 452 88 42 нөміріне хабарласыңыз."},503);
  }
}
