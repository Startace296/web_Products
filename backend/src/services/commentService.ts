// Tầng: service — business logic Comment. Được gọi từ CẢ REST controller lẫn
// sockets/commentSocket.ts — 1 nguồn logic duy nhất cho "tạo comment hợp lệ là gì",
// không lặp lại validate/persist giữa 2 đường vào (REST vs socket).
import { commentRepository, CommentWithUser } from "../repositories/commentRepository";
import { reviewRepository } from "../repositories/reviewRepository";
import { notificationService } from "./notificationService";
import { ApiError } from "../utils/ApiError";
import type { CreateCommentInput } from "../validations/commentValidation";

const listByReview = async (reviewId: string): Promise<CommentWithUser[]> => {
  return commentRepository.findManyByReview(reviewId);
};

const create = async (userId: string, input: CreateCommentInput): Promise<CommentWithUser> => {
  const review = await reviewRepository.findOwnerAndProductId(input.reviewId);
  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  if (input.parentId) {
    const parent = await commentRepository.findReviewIdOf(input.parentId);
    if (!parent || parent.reviewId !== input.reviewId) {
      throw ApiError.badRequest("Parent comment does not belong to this review");
    }
  }

  const comment = await commentRepository.create({
    content: input.content,
    userId,
    reviewId: input.reviewId,
    parentId: input.parentId,
  });

  // Fire-and-forget: thông báo cho chủ review là side-effect, không được làm hỏng
  // (hay làm chậm) việc tạo comment nếu ghi notification/emit socket lỗi.
  notificationService
    .notifyNewComment({ reviewId: input.reviewId, reviewOwnerId: review.userId, actorId: userId, commentId: comment.id })
    .catch((err: unknown) => console.error("[notification] failed to notify new comment:", err));

  return comment;
};

export const commentService = {
  listByReview,
  create,
};
