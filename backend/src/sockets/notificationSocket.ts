// Tầng: socket — phát notification realtime tới ĐÚNG user qua room riêng theo user id
// (khác review room của commentSocket.ts, vốn dùng chung cho nhiều người xem 1 review).
// Không có sự kiện client gửi lên ở đây — notification chỉ được server tạo ra như
// side-effect của comment/vote (xem notificationService.ts), client chỉ nhận.
import type { NotificationWithActor } from "../repositories/notificationRepository";
import type { AppServer } from "./types";

export const userRoom = (userId: string): string => `user:${userId}`;

export const broadcastNotification = (io: AppServer, notification: NotificationWithActor): void => {
  io.to(userRoom(notification.recipientId)).emit("notification:new", notification);
};
