// Tầng: socket — nhận/phát comment realtime. KHÔNG viết lại business logic ở đây:
// "comment:create" gọi lại commentService (đúng service mà commentController REST
// dùng) để validate quyền hạn + lưu DB, đảm bảo 1 nguồn sự thật duy nhất cho
// "comment hợp lệ là gì", dù tạo qua socket hay qua REST.
import { ApiError } from "../utils/ApiError";
import { commentService } from "../services/commentService";
import { createCommentSchema } from "../validations/commentValidation";
import { createSocketRateLimiter } from "./socketRateLimiter";
import type { CommentWithUser } from "../repositories/commentRepository";
import type { AppServer, AppSocket } from "./types";

const reviewRoom = (reviewId: string): string => `review:${reviewId}`;

// Cùng ngưỡng với writeActionLimiter (REST) — 1 user tạo comment qua socket hay qua
// REST đều bị soi chung 1 mức giới hạn, không có đường nào "rẻ" hơn để spam.
const isCommentRateLimited = createSocketRateLimiter(15 * 60 * 1000, 30);

// Dùng chung bởi cả socket handler bên dưới VÀ commentController.create (REST) —
// để comment tạo qua REST cũng hiện realtime cho người đang xem qua socket.
export const broadcastNewComment = (io: AppServer, comment: CommentWithUser): void => {
  io.to(reviewRoom(comment.reviewId)).emit("comment:new", comment);
};

interface AckResponse {
  success: boolean;
  data?: CommentWithUser;
  message?: string;
}

export const registerCommentHandlers = (io: AppServer, socket: AppSocket): void => {
  // Join/leave không yêu cầu đăng nhập — xem comment live là public, giống GET /comments.
  socket.on("review:join", (reviewId: unknown) => {
    if (typeof reviewId !== "string") return;
    void socket.join(reviewRoom(reviewId));
  });

  socket.on("review:leave", (reviewId: unknown) => {
    if (typeof reviewId !== "string") return;
    void socket.leave(reviewRoom(reviewId));
  });

  socket.on("comment:create", async (payload: unknown, ack?: (response: AckResponse) => void) => {
    try {
      // Danh tính DUY NHẤT đáng tin: socket.data.user, được gắn bởi socketAuth.ts sau khi
      // verify JWT lúc handshake. Payload từ client (dù có chứa field userId) không bao
      // giờ được dùng để xác định ai đang comment.
      if (!socket.data.user) {
        ack?.({ success: false, message: "Bạn cần đăng nhập để bình luận" });
        return;
      }

      if (isCommentRateLimited(socket.data.user.id)) {
        ack?.({ success: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau." });
        return;
      }

      const parsed = createCommentSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ success: false, message: "Dữ liệu bình luận không hợp lệ" });
        return;
      }

      const comment = await commentService.create(socket.data.user.id, parsed.data);
      broadcastNewComment(io, comment);
      ack?.({ success: true, data: comment });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Không thể tạo bình luận";
      ack?.({ success: false, message });
    }
  });
};
