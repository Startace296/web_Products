"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { CartLink } from "@/components/cart/CartLink";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { authApi } from "@/services/authApi";

// Không nằm trong danh sách file bước 6 yêu cầu, nhưng cần để các trang (login/
// register/profile/detail) có cách điều hướng qua lại — không có nav thì các trang
// vừa xây chỉ vào được bằng gõ thẳng URL.
export function Navbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearNotifications = useNotificationStore((s) => s.clear);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      clearNotifications();
      router.push("/login");
    },
  });

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-semibold">
        TechPulse
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <CartLink />
            <NotificationBell />
            <Link href="/profile" className="text-muted-foreground hover:text-foreground">
              {user.name}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
              Đăng xuất
            </Button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Đăng nhập
            </Link>
            <Link href="/register">
              <Button size="sm">Đăng ký</Button>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
