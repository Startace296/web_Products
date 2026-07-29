// Tầng: service — tạo notification (side-effect của comment/vote, xem commentService.ts
// và voteService.ts) + phát realtime tới đúng user qua socket. Lỗi ở đây không được
// làm hỏng hành động chính — commentService/voteService gọi các hàm notifyXxx dưới
// dạng "fire-and-forget" (không await, chỉ .catch() log lỗi), nên notify chạy SAU khi
// transaction chính đã commit, không nằm trong cùng transaction.
import { notificationRepository, NotificationWithActor } from "../repositories/notificationRepository";
import { userRepository } from "../repositories/userRepository";
import { ApiError } from "../utils/ApiError";
import { io } from "../sockets";
import { broadcastNotification } from "../sockets/notificationSocket";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotifyNewCommentInput {
  reviewId: string;
  reviewOwnerId: string;
  actorId: string;
  commentId: string;
}

interface NotifyNewVoteInput {
  reviewId: string;
  reviewOwnerId: string;
  actorId: string;
  voteType: "UPVOTE" | "DOWNVOTE";
}

const notifyNewComment = async ({ reviewId, reviewOwnerId, actorId, commentId }: NotifyNewCommentInput): Promise<void> => {
  if (actorId === reviewOwnerId) return; // không tự thông báo cho chính mình

  const actor = await userRepository.findById(actorId);
  if (!actor) return; // phòng thủ — actorId luôn từ JWT đã verify nên không nên xảy ra

  const notification = await notificationRepository.create({
    type: "NEW_COMMENT",
    message: `${actor.name} đã bình luận về đánh giá của bạn`,
    recipientId: reviewOwnerId,
    actorId,
    reviewId,
    commentId,
  });

  broadcastNotification(io, notification);
};

const notifyNewVote = async ({ reviewId, reviewOwnerId, actorId, voteType }: NotifyNewVoteInput): Promise<void> => {
  if (actorId === reviewOwnerId) return;

  const actor = await userRepository.findById(actorId);
  if (!actor) return;

  const action = voteType === "UPVOTE" ? "upvote" : "downvote";
  const notification = await notificationRepository.create({
    type: "NEW_VOTE",
    message: `${actor.name} đã ${action} đánh giá của bạn`,
    recipientId: reviewOwnerId,
    actorId,
    reviewId,
  });

  broadcastNotification(io, notification);
};

const listByRecipient = async (
  recipientId: string,
  page: number,
  limit: number
): Promise<{ items: NotificationWithActor[]; pagination: Pagination; unreadCount: number }> => {
  const skip = (page - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    notificationRepository.findManyByRecipient(recipientId, { skip, take: limit }),
    notificationRepository.countByRecipient(recipientId),
    notificationRepository.countUnreadByRecipient(recipientId),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    unreadCount,
  };
};

const markAsRead = async (recipientId: string, notificationId: string): Promise<void> => {
  const result = await notificationRepository.markAsRead(notificationId, recipientId);
  if (result.count === 0) {
    throw ApiError.notFound("Notification not found");
  }
};

const markAllAsRead = async (recipientId: string): Promise<void> => {
  await notificationRepository.markAllAsRead(recipientId);
};

export const notificationService = {
  notifyNewComment,
  notifyNewVote,
  listByRecipient,
  markAsRead,
  markAllAsRead,
};
