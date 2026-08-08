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

// Không cho phép "PENDING_PAYMENT" làm target: trạng thái này chỉ được set tự động lúc
// tạo đơn VNPAY, và chỉ IPN của VNPay mới được đưa đơn ra khỏi nó (xem paymentService.
// handleIpn) — admin thao tay vào giữa chừng có thể xác nhận 1 đơn CHƯA thực sự thanh toán.
export const updateOrderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"]),
});

export const adminListOrdersQuerySchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AdminListOrdersQuery = z.infer<typeof adminListOrdersQuerySchema>;
