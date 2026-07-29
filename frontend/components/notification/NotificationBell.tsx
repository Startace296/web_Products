"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocket } from "@/hooks/useSocket";
import { notificationApi, type AppNotification } from "@/services/notificationApi";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { cn } from "@/lib/utils";

// Không có UI phân trang trong dropdown — chỉ hiện 20 thông báo gần nhất (đủ cho 1
// dropdown), không phải danh sách đầy đủ có "trang sau/trước".
export function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const socket = useSocket();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setInitial = useNotificationStore((s) => s.setInitial);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const { data } = useQuery({
    queryKey: ["notifications", "initial"],
    queryFn: () => notificationApi.list(1, 20),
    enabled: !!user,
  });

  useEffect(() => {
    if (data) setInitial(data.items, data.unreadCount);
  }, [data, setInitial]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNew = (notification: AppNotification) => addNotification(notification);
    socket.on("notification:new", handleNew);

    return () => {
      socket.off("notification:new", handleNew);
    };
  }, [socket, user, addNotification]);

  if (!user) return null;

  const handleItemClick = (notification: AppNotification) => {
    if (notification.isRead) return;
    markAsRead(notification.id); // optimistic — không rollback nếu request lỗi, chỉ log
    notificationApi.markAsRead(notification.id).catch((err) => console.error("Failed to mark notification as read:", err));
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    notificationApi.markAllAsRead().catch((err) => console.error("Failed to mark all notifications as read:", err));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          {/* Không dùng DropdownMenuLabel: Base UI's Menu.GroupLabel throw runtime error
          nếu không nằm trong Menu.Group — chỉ là tiêu đề tĩnh nên dùng thẻ thường. */}
          <p className="text-xs font-medium text-muted-foreground">Thông báo</p>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleMarkAllAsRead}>
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Chưa có thông báo nào.</p>
        )}

        {notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            onClick={() => handleItemClick(n)}
            className={cn("flex flex-col items-start gap-0.5 whitespace-normal", !n.isRead && "bg-muted/50")}
          >
            <p className="text-sm">{n.message}</p>
            <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("vi-VN")}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
