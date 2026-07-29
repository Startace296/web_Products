// Tầng: service — toggle vote (business logic) + đồng bộ upvoteCount/downvoteCount
// trên Review. Không import Express.
import type { Prisma, VoteType } from "@prisma/client";
import { runInTransaction } from "../config/prisma";
import { voteRepository } from "../repositories/voteRepository";
import { reviewRepository } from "../repositories/reviewRepository";
import { notificationService } from "./notificationService";
import { ApiError } from "../utils/ApiError";

interface ToggleVoteResult {
  vote: { type: VoteType } | null; // null nếu vừa bỏ vote (toggle off)
  upvoteCount: number;
  downvoteCount: number;
}

const syncReviewVoteCounts = async (
  reviewId: string,
  tx: Prisma.TransactionClient
): Promise<{ upvoteCount: number; downvoteCount: number }> => {
  const counts = await voteRepository.countByReviewAndType(reviewId, tx);
  await reviewRepository.updateVoteCounts(reviewId, counts, tx);
  return counts;
};

const toggle = async (userId: string, reviewId: string, type: VoteType): Promise<ToggleVoteResult> => {
  const review = await reviewRepository.findOwnerAndProductId(reviewId);
  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  const result = await runInTransaction(async (tx) => {
    const existing = await voteRepository.findByUserAndReview(userId, reviewId, tx);

    let vote: { type: VoteType } | null;

    if (!existing) {
      const created = await voteRepository.create({ userId, reviewId, type }, tx);
      vote = { type: created.type };
    } else if (existing.type === type) {
      // Bấm lại đúng loại đã vote trước đó -> bỏ vote (toggle off).
      await voteRepository.remove(existing.id, tx);
      vote = null;
    } else {
      // Đổi chiều: từ UPVOTE sang DOWNVOTE hoặc ngược lại.
      const updated = await voteRepository.updateType(existing.id, type, tx);
      vote = { type: updated.type };
    }

    const counts = await syncReviewVoteCounts(reviewId, tx);
    return { vote, ...counts };
  });

  // Chỉ thông báo khi vừa TẠO hoặc ĐỔI CHIỀU vote (result.vote !== null) — bỏ vote
  // (toggle off, result.vote === null) không thông báo, "ai đó vừa rút vote" không
  // phải tin đáng để báo. Chạy SAU khi transaction đã commit, fire-and-forget.
  if (result.vote) {
    notificationService
      .notifyNewVote({ reviewId, reviewOwnerId: review.userId, actorId: userId, voteType: result.vote.type })
      .catch((err: unknown) => console.error("[notification] failed to notify new vote:", err));
  }

  return result;
};

export const voteService = {
  toggle,
};
