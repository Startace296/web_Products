// Tầng: service — component chỉ được gọi API notification qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export interface NotificationActor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export type NotificationType = "NEW_COMMENT" | "NEW_REPLY" | "NEW_VOTE" | "SYSTEM";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  recipientId: string;
  reviewId: string | null;
  commentId: string | null;
  createdAt: string;
  actor: NotificationActor | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListEnvelope<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  unreadCount: number;
}

export interface ListNotificationsResult {
  items: AppNotification[];
  pagination: Pagination;
  unreadCount: number;
}

export const notificationApi = {
  list: async (page = 1, limit = 20): Promise<ListNotificationsResult> => {
    const { data } = await api.get<ListEnvelope<AppNotification>>("/notifications", { params: { page, limit } });
    return { items: data.data, pagination: data.pagination, unreadCount: data.unreadCount };
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },
};
