// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Review.
import { prisma } from "../config/prisma";
import type { Prisma, Review } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

// Chỉ select field cần thiết của user đi kèm review — KHÔNG bao giờ kéo passwordHash,
// và select lồng nhau này được Prisma dịch thành 1 câu SQL duy nhất (JOIN/batch),
// không phải N+1 (xem reviewService/reviewRepository — không có vòng lặp await nào
// gọi user.findUnique cho từng review).
const reviewSelect = {
  id: true,
  title: true,
  content: true,
  rating: true,
  userId: true,
  productId: true,
  upvoteCount: true,
  downvoteCount: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, avatarUrl: true },
  },
} satisfies Prisma.ReviewSelect;

export type ReviewWithUser = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

interface CreateReviewInput {
  title: string;
  content: string;
  rating: number;
  userId: string;
  productId: string;
}

interface UpdateReviewInput {
  title?: string;
  content?: string;
  rating?: number;
}

interface FindManyByProductParams {
  productId: string;
  skip: number;
  take: number;
}

const findManyByProduct = (
  { productId, skip, take }: FindManyByProductParams,
  db: DbClient = prisma
): Promise<ReviewWithUser[]> => {
  return db.review.findMany({
    where: { productId },
    select: reviewSelect,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
};

const countByProduct = (productId: string, db: DbClient = prisma): Promise<number> => {
  return db.review.count({ where: { productId } });
};

// Sắp theo điểm (upvote - downvote). Prisma không hỗ trợ orderBy trên biểu thức 2 cột,
// nên lấy ID đã sắp bằng raw SQL (tham số hoá qua tagged template — an toàn khỏi SQL
// injection) rồi mới findMany theo reviewSelect để không lặp lại logic ẩn passwordHash.
const findManyByProductSortedByScore = async (
  { productId, skip, take }: FindManyByProductParams,
  db: DbClient = prisma
): Promise<ReviewWithUser[]> => {
  const ranked = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM reviews
    WHERE product_id = ${productId}
    ORDER BY (upvote_count - downvote_count) DESC, created_at DESC
    LIMIT ${take} OFFSET ${skip}
  `;

  if (ranked.length === 0) return [];

  const ids = ranked.map((r) => r.id);
  const reviews = await db.review.findMany({
    where: { id: { in: ids } },
    select: reviewSelect,
  });

  // findMany({ where: { id: { in } } }) không đảm bảo giữ thứ tự của mảng `in` —
  // sắp lại đúng theo thứ tự điểm đã tính ở trên.
  const orderIndex = new Map(ids.map((id, index) => [id, index]));
  return reviews.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
};

const findById = (id: string, db: DbClient = prisma): Promise<ReviewWithUser | null> => {
  return db.review.findUnique({ where: { id }, select: reviewSelect });
};

// Dùng riêng cho check quyền sở hữu ở service — nhẹ hơn, không kéo theo user.
const findOwnerAndProductId = (
  id: string,
  db: DbClient = prisma
): Promise<Pick<Review, "id" | "userId" | "productId"> | null> => {
  return db.review.findUnique({
    where: { id },
    select: { id: true, userId: true, productId: true },
  });
};

const create = (input: CreateReviewInput, db: DbClient = prisma): Promise<ReviewWithUser> => {
  return db.review.create({ data: input, select: reviewSelect });
};

const update = (id: string, input: UpdateReviewInput, db: DbClient = prisma): Promise<ReviewWithUser> => {
  return db.review.update({ where: { id }, data: input, select: reviewSelect });
};

const remove = (id: string, db: DbClient = prisma): Promise<Review> => {
  return db.review.delete({ where: { id } });
};

const updateVoteCounts = (
  id: string,
  data: { upvoteCount: number; downvoteCount: number },
  db: DbClient = prisma
): Promise<Review> => {
  return db.review.update({ where: { id }, data });
};

const aggregateRatingByProduct = async (
  productId: string,
  db: DbClient = prisma
): Promise<{ avgRating: number; reviewCount: number }> => {
  const result = await db.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  return {
    avgRating: result._avg.rating ?? 0,
    reviewCount: result._count,
  };
};

export const reviewRepository = {
  findManyByProduct,
  findManyByProductSortedByScore,
  countByProduct,
  findById,
  findOwnerAndProductId,
  create,
  update,
  remove,
  updateVoteCounts,
  aggregateRatingByProduct,
};
