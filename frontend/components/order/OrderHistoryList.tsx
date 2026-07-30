"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orderApi, type Order, type OrderStatus } from "@/services/orderApi";

const priceFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
};

const STATUS_BADGE_VARIANT: Record<OrderStatus, "secondary" | "outline" | "destructive"> = {
  PENDING_PAYMENT: "outline",
  CONFIRMED: "secondary",
  SHIPPING: "secondary",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

function OrderRow({ order }: { order: Order }) {
  const itemsPreview = order.items.map((item) => item.productName).join(", ");
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link href={`/orders/${order.id}`} className="block">
      <Card className="transition-colors hover:border-primary">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Đơn #{order.id.slice(-8)}</span>
              <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {itemsPreview} ({totalQuantity} sản phẩm)
            </p>
            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          <span className="shrink-0 font-semibold">{priceFormatter.format(order.totalAmount)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function OrderHistoryList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => orderApi.list({ page }),
  });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Đơn hàng của tôi{data ? ` (${data.pagination.total})` : ""}</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được danh sách đơn hàng.</p>}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Bạn chưa có đơn hàng nào.{" "}
          <Link href="/" className="text-primary underline underline-offset-4">
            Tiếp tục xem sản phẩm
          </Link>
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {data.pagination.page}/{data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
