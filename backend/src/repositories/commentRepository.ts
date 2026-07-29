// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Comment.
import { prisma } from "../config/prisma";
import type { Comment, Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

// Chỉ select field cần thiết của user đi kèm comment — không kéo passwordHash.
// select lồng nhau -> 1 query duy nhất (JOIN/batch), không N+1 (cùng lý do với reviewRepository).
const commentSelect = {
  id: true,
  content: true,
  userId: true,
  reviewId: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, avatarUrl: true },
  },
} satisfies Prisma.CommentSelect;

export type CommentWithUser = Prisma.CommentGetPayload<{ select: typeof commentSelect }>;

interface CreateCommentInput {
  content: string;
  userId: string;
  reviewId: string;
  parentId?: string;
}

const findManyByReview = (reviewId: string, db: DbClient = prisma): Promise<CommentWithUser[]> => {
  return db.comment.findMany({
    where: { reviewId },
    select: commentSelect,
    orderBy: { createdAt: "asc" },
  });
};

const create = (input: CreateCommentInput, db: DbClient = prisma): Promise<CommentWithUser> => {
  return db.comment.create({ data: input, select: commentSelect });
};

// Dùng để validate parentId thuộc đúng reviewId khi tạo reply — nhẹ, không kéo theo user.
const findReviewIdOf = (id: string, db: DbClient = prisma): Promise<Pick<Comment, "id" | "reviewId"> | null> => {
  return db.comment.findUnique({ where: { id }, select: { id: true, reviewId: true } });
};

export const commentRepository = {
  findManyByReview,
  create,
  findReviewIdOf,
};
