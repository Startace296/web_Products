// Tầng: validation — Zod schema cho product.
import { z } from "zod";

// "newest" giữ nguyên hành vi mặc định trước đây (createdAt desc) — không đổi contract
// cũ nếu FE không gửi sortBy.
export const listProductsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  sortBy: z.enum(["newest", "reviewCount", "rating"]).default("newest"),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
