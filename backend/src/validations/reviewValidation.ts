// Tầng: validation — Zod schema cho review.
import { z } from "zod";

export const listReviewsQuerySchema = z.object({
  productId: z.string().cuid("Invalid product id"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  // "newest" giữ nguyên hành vi mặc định từ bước 4 — không đổi contract cũ nếu FE không gửi sortBy.
  sortBy: z.enum(["newest", "score"]).default("newest"),
});

export const reviewIdParamSchema = z.object({
  id: z.string().cuid("Invalid review id"),
});

export const createReviewSchema = z.object({
  productId: z.string().cuid("Invalid product id"),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  content: z.string().trim().min(10, "Content must be at least 10 characters").max(5000),
  rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5").max(5),
});

export const updateReviewSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    content: z.string().trim().min(10).max(5000).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
