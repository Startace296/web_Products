"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheckIcon, CalendarIcon, CameraIcon, ChevronRightIcon, LogOutIcon, PackageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/authApi";
import { userApi } from "@/services/userApi";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

// Mirrors the backend's middlewares/upload.ts limits so the user gets instant feedback
// instead of waiting for a round-trip — the backend remains the real enforcement point.
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const joinedDateFormatter = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });

export function ProfileView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearNotifications = useNotificationStore((s) => s.clear);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Xoá state phía client dù backend logout thành công hay lỗi mạng —
      // với JWT stateless, mục tiêu chính vẫn là client quên token/cookie.
      clearAuth();
      clearNotifications();
      router.push("/login");
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: userApi.uploadAvatar,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setAvatarError(null);
    },
    onError: (error) => {
      setAvatarError(getErrorMessage(error, "Không tải lên được ảnh đại diện."));
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại đúng file đó lần sau nếu upload lỗi
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError("Ảnh phải nhỏ hơn 5MB.");
      return;
    }

    setAvatarError(null);
    uploadAvatarMutation.mutate(file);
  };

  if (!user) return null;

  return (
    // Card kính mờ (glassmorphism) ngồi trên quầng sáng của page wrapper (xem
    // app/profile/page.tsx). [--card-spacing:0px] triệt tiêu padding mặc định của Card
    // (xem components/ui/card.tsx) để dải banner phía trên tràn sát viền, phần nội dung
    // bên dưới tự khai padding riêng qua CardContent.
    <Card className="relative w-full max-w-md overflow-hidden border border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl [--card-spacing:0px]">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/25 via-card to-accent/20">
        <div className="pointer-events-none absolute -top-10 -left-6 size-32 rounded-full bg-primary/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 -bottom-10 size-32 rounded-full bg-accent/30 blur-2xl" />
      </div>

      <CardContent className="flex flex-col gap-5 px-6 pt-0 pb-6">
        <div className="-mt-12 flex items-end justify-between">
          <div className="relative w-fit">
            <Avatar className="size-24 ring-4 ring-card">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
              <AvatarFallback className="text-2xl">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              aria-label="Đổi ảnh đại diện"
              className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <CameraIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-xl font-bold text-foreground">{user.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{user.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}</Badge>
            {user.isVerified ? (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheckIcon className="size-3" />
                Đã xác thực
              </Badge>
            ) : (
              <Badge variant="outline">Chưa xác thực email</Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              Tham gia {joinedDateFormatter.format(new Date(user.createdAt))}
            </span>
          </div>
        </div>

        {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}

        {user.bio && <p className="rounded-xl bg-muted/50 p-3 text-sm text-foreground">{user.bio}</p>}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Link
            href="/orders"
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <PackageIcon className="size-4 text-primary" />
              Đơn hàng của tôi
            </span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </Link>

          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-destructive transition-colors hover:border-destructive hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-50"
          >
            <LogOutIcon className="size-4" />
            {logoutMutation.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
