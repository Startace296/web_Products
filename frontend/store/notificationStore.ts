// Tầng: store (Zustand) — danh sách notification + số chưa đọc, dùng chung toàn app
// (NotificationBell đọc/ghi qua đây, không tự giữ state riêng).
import { create } from "zustand";
import type { AppNotification } from "@/services/notificationApi";

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  setInitial: (notifications: AppNotification[], unreadCount: number) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setInitial: (notifications, unreadCount) => set({ notifications, unreadCount }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.isRead) return state; // đã đọc rồi thì không trừ unreadCount lần nữa
      return {
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  // Dọn sạch lúc logout — tránh notification của user cũ còn sót lại hiện cho user mới
  // (vd: máy dùng chung, đăng xuất rồi đăng nhập tài khoản khác trên cùng tab).
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
