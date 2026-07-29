// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Notification.
import { prisma } from "../config/prisma";
import type { NotificationType, Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

const notificationSelect = {
  id: true,
  type: true,
  message: true,
  isRead: true,
  recipientId: true,
  reviewId: true,
  commentId: true,
  createdAt: true,
  actor: {
    select: { id: true, name: true, avatarUrl: true },
  },
} satisfies Prisma.NotificationSelect;

export type NotificationWithActor = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  recipientId: string;
  actorId?: string;
  reviewId?: string;
  commentId?: string;
}

interface FindManyParams {
  skip: number;
  take: number;
}

const create = (input: CreateNotificationInput, db: DbClient = prisma): Promise<NotificationWithActor> => {
  return db.notification.create({ data: input, select: notificationSelect });
};

const findManyByRecipient = (
  recipientId: string,
  { skip, take }: FindManyParams,
  db: DbClient = prisma
): Promise<NotificationWithActor[]> => {
  return db.notification.findMany({
    where: { recipientId },
    select: notificationSelect,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
};

const countByRecipient = (recipientId: string, db: DbClient = prisma): Promise<number> => {
  return db.notification.count({ where: { recipientId } });
};

const countUnreadByRecipient = (recipientId: string, db: DbClient = prisma): Promise<number> => {
  return db.notification.count({ where: { recipientId, isRead: false } });
};

// updateMany với where lọc CẢ recipientId — user chỉ đánh dấu được thông báo của
// chính mình, không phải update-by-id trần (tránh IDOR: đoán ID của người khác).
// count=0 nghĩa là không tồn tại HOẶC không phải của mình — service coi cả 2 là 404,
// không phân biệt để không lộ thông tin id có tồn tại hay không.
const markAsRead = (id: string, recipientId: string, db: DbClient = prisma): Promise<Prisma.BatchPayload> => {
  return db.notification.updateMany({
    where: { id, recipientId },
    data: { isRead: true },
  });
};

const markAllAsRead = (recipientId: string, db: DbClient = prisma): Promise<Prisma.BatchPayload> => {
  return db.notification.updateMany({
    where: { recipientId, isRead: false },
    data: { isRead: true },
  });
};

export const notificationRepository = {
  create,
  findManyByRecipient,
  countByRecipient,
  countUnreadByRecipient,
  markAsRead,
  markAllAsRead,
};
