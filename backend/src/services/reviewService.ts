// Tầng: service — business logic Review: CRUD, kiểm tra quyền sở hữu, và đồng bộ
// avgRating/reviewCount trên Product (denormalized field — quyết định từ bước 2,
// service là nơi chịu trách nhiệm giữ nó khớp với dữ liệu Review thật).
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { reviewRepository, ReviewWithUser } from "../repositories/reviewRepository";
import { productRepository } from "../repositories/productRepository";
import { ApiError } from "../utils/ApiError";
import type { CreateReviewInput, ListReviewsQuery, UpdateReviewInput } from "../validations/reviewValidation";

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const syncProductAggregates = async (productId: string, tx: Prisma.TransactionClient): Promise<void> => {
  const { avgRating, reviewCount } = await reviewRepository.aggregateRatingByProduct(productId, tx);
  await productRepository.updateAggregates(productId, { avgRating, reviewCount }, tx);
};

const listByProduct = async (query: ListReviewsQuery): Promise<PaginatedResult<ReviewWithUser>> => {
  const { productId, page, limit, sortBy } = query;
  const skip = (page - 1) * limit;

  const findMany =
    sortBy === "score" ? reviewRepository.findManyByProductSortedByScore : reviewRepository.findManyByProduct;

  const [items, total] = await Promise.all([
    findMany({ productId, skip, take: limit }),
    reviewRepository.countByProduct(productId),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getById = async (id: string): Promise<ReviewWithUser> => {
  const review = await reviewRepository.findById(id);
  if (!review) {
    throw ApiError.notFound("Review not found");
  }
  return review;
};

const create = async (userId: string, input: CreateReviewInput): Promise<ReviewWithUser> => {
  const product = await productRepository.findById(input.productId);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  return prisma.$transaction(async (tx) => {
    const review = await reviewRepository.create(
      {
        title: input.title,
        content: input.content,
        rating: input.rating,
        userId,
        productId: input.productId,
      },
      tx
    );
    await syncProductAggregates(input.productId, tx);
    return review;
  });
};

const update = async (userId: string, reviewId: string, input: UpdateReviewInput): Promise<ReviewWithUser> => {
  const existing = await reviewRepository.findOwnerAndProductId(reviewId);
  if (!existing) {
    throw ApiError.notFound("Review not found");
  }
  // Kiểm tra quyền sở hữu Ở ĐÂY (service), không phải controller — theo đúng yêu cầu.
  if (existing.userId !== userId) {
    throw ApiError.forbidden("You can only edit your own review");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await reviewRepository.update(reviewId, input, tx);
    // Chỉ recompute avgRating nếu rating thực sự đổi — tránh 1 write thừa mỗi lần sửa title/content.
    if (input.rating !== undefined) {
      await syncProductAggregates(existing.productId, tx);
    }
    return updated;
  });
};

const remove = async (userId: string, reviewId: string): Promise<void> => {
  const existing = await reviewRepository.findOwnerAndProductId(reviewId);
  if (!existing) {
    throw ApiError.notFound("Review not found");
  }
  if (existing.userId !== userId) {
    throw ApiError.forbidden("You can only delete your own review");
  }

  await prisma.$transaction(async (tx) => {
    await reviewRepository.remove(reviewId, tx);
    await syncProductAggregates(existing.productId, tx);
  });
};

export const reviewService = {
  listByProduct,
  getById,
  create,
  update,
  remove,
};
