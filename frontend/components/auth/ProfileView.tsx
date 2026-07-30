"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/authApi";
import { userApi } from "@/services/userApi";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

// Mirrors the backend's middlewares/upload.ts limits so the user gets instant feedback
// instead of waiting for a round-trip — the backend remains the real enforcement point.
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

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
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{user.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{user.role}</Badge>
          {user.isVerified ? (
            <Badge variant="secondary">Đã xác thực</Badge>
          ) : (
            <Badge variant="outline">Chưa xác thực email</Badge>
          )}
        </div>

        {user.bio && <p className="text-sm">{user.bio}</p>}

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatarMutation.isPending}
          >
            {uploadAvatarMutation.isPending ? "Đang tải lên..." : "Đổi ảnh đại diện"}
          </Button>
          {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
        </div>

        <Link href="/orders">
          <Button variant="outline" className="w-full">
            Đơn hàng của tôi
          </Button>
        </Link>

        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
        </Button>
      </CardContent>
    </Card>
  );
}
