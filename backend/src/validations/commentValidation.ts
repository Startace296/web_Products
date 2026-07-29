// Tầng: validation — Zod schema cho comment. Dùng cho CẢ route REST lẫn socket
// handler (sockets/commentSocket.ts parse payload bằng safeParse của schema này),
// đảm bảo 1 quy tắc validate duy nhất cho dữ liệu comment dù đi qua đường nào.
import { z } from "zod";

export const listCommentsQuerySchema = z.object({
  reviewId: z.string().cuid("Invalid review id"),
});

export const createCommentSchema = z.object({
  reviewId: z.string().cuid("Invalid review id"),
  content: z.string().trim().min(1, "Content is required").max(2000),
  parentId: z.string().cuid("Invalid parent comment id").optional(),
});

export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
