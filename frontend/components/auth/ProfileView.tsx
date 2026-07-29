"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

export function ProfileView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearNotifications = useNotificationStore((s) => s.clear);

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
