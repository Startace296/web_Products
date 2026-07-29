// Tầng: controller — CHỈ đọc req, gọi service, trả res.
// Ngoại lệ có chủ đích: sau khi service tạo comment thành công, controller phát
// (broadcast) sự kiện realtime — đây không phải business logic (không quyết định
// comment có hợp lệ hay không) mà là side-effect thuộc tầng "gửi thông báo", cùng vai
// trò với việc controller set cookie ở authController. Không làm vậy thì comment tạo
// qua REST sẽ không hiện realtime cho người khác đang xem cùng review qua socket.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { commentService } from "../services/commentService";
import { io } from "../sockets";
import { broadcastNewComment } from "../sockets/commentSocket";
import type { CreateCommentInput, ListCommentsQuery } from "../validations/commentValidation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.query as unknown as ListCommentsQuery;
  const comments = await commentService.listByReview(reviewId);
  res.status(200).json({ success: true, data: comments });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const comment = await commentService.create(req.user!.id, req.body as CreateCommentInput);
  broadcastNewComment(io, comment);
  res.status(201).json({ success: true, data: comment });
});
