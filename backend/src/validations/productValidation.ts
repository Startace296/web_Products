// Tầng: validation — Zod schema cho product.
import { z } from "zod";

export const listProductsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
