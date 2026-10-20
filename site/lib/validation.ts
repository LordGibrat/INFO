import { z } from "zod";

export const statuses = ["new", "contacted", "confirmed", "production", "ready", "shipped", "completed", "cancelled"] as const;
export const services = ["event", "neon", "lettering", "canvas"] as const;
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const phone = z.string().trim().max(30).transform(value => {
  const digits = value.replace(/[+()\s-]/g, "");
  return digits.startsWith("8") ? `+7${digits.slice(1)}` : `+${digits}`;
}).refine(value => /^\+7\d{10}$/.test(value), "Қазақстан телефон нөмірін енгізіңіз.");
const optionalPhone = z.union([z.literal(""),phone]).optional().default("");

export const orderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone,
  service: z.enum(services),
  event: optionalText(200),
  eventDate: optionalText(10).refine(value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    const todayKz = new Date(Date.now()+5*60*60*1000).toISOString().slice(0,10);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value && value >= todayKz;
  }, "Іс-шара күнін дұрыс енгізіңіз."),
  signText: optionalText(500),
  color: optionalText(100),
  details: optionalText(3000),
  deliveryMethod: z.enum(["pickup","oral","kazpost"]),
  recipientName: optionalText(100),
  recipientPhone: optionalPhone,
  region: optionalText(100),
  city: optionalText(100),
  address: optionalText(500),
  apartment: optionalText(50),
  postalCode: optionalText(7),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
  idempotencyKey: z.uuid(),
}).superRefine((value, context) => {
  const required = (key: keyof typeof value, message: string) => {
    if (!value[key]) context.addIssue({code:"custom",path:[key],message});
  };
  if (value.deliveryMethod === "oral" || value.deliveryMethod === "kazpost") {
    required("city","Қаланы көрсетіңіз.");
    required("address","Көше мен үй нөмірін көрсетіңіз.");
    required("recipientName","Алушының атын көрсетіңіз.");
    required("recipientPhone","Алушының телефонын көрсетіңіз.");
  }
  if (value.deliveryMethod === "kazpost") {
    for (const key of ["recipientName","recipientPhone","region"] as const) required(key,"Жеткізу деректерін толықтырыңыз.");
    if (!/^(?:\d{6}|[A-Za-z]\d{2}[A-Za-z]\d[A-Za-z]\d)$/.test(value.postalCode)) {
      context.addIssue({code:"custom",path:["postalCode"],message:"6 саннан тұратын немесе жаңа форматтағы пошта индексін енгізіңіз."});
    }
    if (value.service === "event") context.addIssue({code:"custom",path:["deliveryMethod"],message:"Іс-шараны безендіру Орал қаласында келісіледі, Қазпошта арқылы жіберілмейді."});
  }
});

const adminUpdateFields = {
  status: z.enum(statuses).optional(),
  adminNotes: z.string().trim().max(5000).optional(),
  shippingCost: z.number().finite().min(0).max(10000000).nullable().optional(),
  trackingNumber: z.string().trim().max(100).optional(),
};
const containsUpdate = (value: object) => Object.keys(adminUpdateFields).some(key=>Object.prototype.hasOwnProperty.call(value,key));
export const adminUpdateSchema = z.object(adminUpdateFields).strict().refine(containsUpdate,"Өзгеріс жоқ.");
export const adminUpdateRequestSchema = z.object({
  ...adminUpdateFields,
  updatedAt: z.iso.datetime().optional(),
}).strict().refine(containsUpdate,"Өзгеріс жоқ.");
export type OrderInput = z.infer<typeof orderSchema>;
export type AdminUpdate = z.infer<typeof adminUpdateSchema>;
