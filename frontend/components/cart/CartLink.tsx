"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cartApi } from "@/services/cartApi";
import { useAuthStore } from "@/store/authStore";

// Cùng pattern với NotificationBell: icon + badge số lượng trong Navbar, dữ liệu từ
// React Query (server state) — không có Zustand store riêng cho giỏ hàng, giỏ đã gắn
// với tài khoản ở backend nên không cần cache client ngoài query cache.
export function CartLink() {
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["cart"],
    queryFn: cartApi.get,
    enabled: !!user,
  });

  if (!user) return null;

  const totalItems = data?.totalItems ?? 0;

  return (
    <Link href="/cart">
      <Button variant="ghost" size="icon" className="relative">
        <ShoppingCartIcon />
        {totalItems > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {totalItems > 9 ? "9+" : totalItems}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
