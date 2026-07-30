"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/services/authApi";

type Status = "checking" | "authed" | "unauthed";

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Kiểm tra role CHỈ để UX (ẩn trang thay vì hiện lỗi khó hiểu) — backend vẫn là nơi
  // enforce thật qua middleware requireRole, không tin phía client cho việc bảo mật.
  requireRole?: "ADMIN";
}

// Auth là client-side (accessToken chỉ ở memory, xem store/authStore.ts) nên "protected
// route" cũng phải check ở client: nếu store đang trống (vd: vừa reload trang cứng),
// thử gọi /auth/me trước khi kết luận chưa đăng nhập — request 401 sẽ tự kích hoạt
// refresh qua cookie httpOnly (xem lib/axios.ts), không bounce oan người đã đăng nhập.
export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [status, setStatus] = useState<Status>(user ? "authed" : "checking");

  useEffect(() => {
    // user đã có sẵn trong store (vd: vừa login xong, effect chạy lại do user đổi) —
    // initializer của useState ở trên đã set status="authed" cho lần này, khỏi set lại.
    if (user) return;

    let cancelled = false;

    authApi
      .me()
      .then((fetchedUser) => {
        if (cancelled) return;
        setUser(fetchedUser);
        setStatus("authed");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("unauthed");
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [user, setUser, router]);

  if (status === "checking") {
    return (
      <div className="flex flex-1 items-center justify-center p-16 text-sm text-muted-foreground">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  if (status === "unauthed") {
    return null; // router.replace("/login") đang điều hướng
  }

  if (requireRole && user?.role !== requireRole) {
    return (
      <div className="flex flex-1 items-center justify-center p-16 text-sm text-muted-foreground">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return <>{children}</>;
}
