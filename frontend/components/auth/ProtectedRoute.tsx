"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/services/authApi";

type Status = "checking" | "authed" | "unauthed";

// Auth là client-side (accessToken chỉ ở memory, xem store/authStore.ts) nên "protected
// route" cũng phải check ở client: nếu store đang trống (vd: vừa reload trang cứng),
// thử gọi /auth/me trước khi kết luận chưa đăng nhập — request 401 sẽ tự kích hoạt
// refresh qua cookie httpOnly (xem lib/axios.ts), không bounce oan người đã đăng nhập.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}
