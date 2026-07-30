// Tầng: validation — Zod schema cho order.
import { z } from "zod";

export const createOrderSchema = z.object({
  paymentMethod: z.enum(["COD", "VNPAY"]),
  recipientName: z.string().trim().min(2, "Recipient name is required").max(100),
  recipientPhone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{9,10}$/, "Invalid Vietnamese phone number"),
  shippingAddress: z.string().trim().min(10, "Shipping address is too short").max(500),
  note: z.string().trim().max(500).optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().cuid("Invalid order id"),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
