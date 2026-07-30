// Tầng: validation — Zod schema cho cart.
import { z } from "zod";

// Chặn cả yêu cầu 1 lần lẫn tích luỹ nhiều lần "thêm vào giỏ" — cartService kiểm tra
// (existing.quantity + input.quantity) so với mức này, không chỉ input.quantity.
export const MAX_QUANTITY_PER_ITEM = 10;

export const addCartItemSchema = z.object({
  productId: z.string().cuid("Invalid product id"),
  quantity: z.coerce.number().int().positive().max(MAX_QUANTITY_PER_ITEM).default(1),
});

export const updateCartItemSchema = z.object({
  // 0 = xoá khỏi giỏ, xử lý ở cartService.updateItem.
  quantity: z.coerce.number().int().min(0).max(MAX_QUANTITY_PER_ITEM),
});

export const cartItemParamSchema = z.object({
  productId: z.string().cuid("Invalid product id"),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
