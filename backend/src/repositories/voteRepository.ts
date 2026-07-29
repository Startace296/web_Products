// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Vote.
import { prisma } from "../config/prisma";
import type { Prisma, Vote, VoteType } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CreateVoteInput {
  userId: string;
  reviewId: string;
  type: VoteType;
}

// reviewId_userId là tên compound unique Prisma tự sinh từ @@unique([reviewId, userId])
// trong schema.prisma — đúng thứ tự khai báo field.
const findByUserAndReview = (userId: string, reviewId: string, db: DbClient = prisma): Promise<Vote | null> => {
  return db.vote.findUnique({ where: { reviewId_userId: { reviewId, userId } } });
};

const create = (input: CreateVoteInput, db: DbClient = prisma): Promise<Vote> => {
  return db.vote.create({ data: input });
};

const updateType = (id: string, type: VoteType, db: DbClient = prisma): Promise<Vote> => {
  return db.vote.update({ where: { id }, data: { type } });
};

const remove = (id: string, db: DbClient = prisma): Promise<Vote> => {
  return db.vote.delete({ where: { id } });
};

const countByReviewAndType = async (
  reviewId: string,
  db: DbClient = prisma
): Promise<{ upvoteCount: number; downvoteCount: number }> => {
  const [upvoteCount, downvoteCount] = await Promise.all([
    db.vote.count({ where: { reviewId, type: "UPVOTE" } }),
    db.vote.count({ where: { reviewId, type: "DOWNVOTE" } }),
  ]);

  return { upvoteCount, downvoteCount };
};

export const voteRepository = {
  findByUserAndReview,
  create,
  updateType,
  remove,
  countByReviewAndType,
};
