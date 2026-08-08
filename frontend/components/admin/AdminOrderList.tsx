"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { orderApi, type AdminOrder, type OrderStatus, type UpdatableOrderStatus } from "@/services/orderApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

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

// Cùng state machine với orderService.updateStatus ở backend — chỉ dùng để QUYẾT ĐỊNH
// hiện nút nào (UX), backend vẫn là nơi enforce thật nên không sợ FE/BE lệch nhau gây lỗ hổng.
const NEXT_ACTIONS: Partial<Record<OrderStatus, { status: UpdatableOrderStatus; label: string; destructive?: boolean }[]>> = {
  CONFIRMED: [
    { status: "SHIPPING", label: "Giao hàng" },
    { status: "CANCELLED", label: "Huỷ đơn", destructive: true },
  ],
  SHIPPING: [{ status: "COMPLETED", label: "Hoàn tất" }],
};

function AdminOrderRow({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: (status: UpdatableOrderStatus) => orderApi.updateStatus(order.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    },
  });

  const handleAction = (status: UpdatableOrderStatus, destructive?: boolean) => {
    if (destructive) {
      const confirmed = window.confirm(
        `Huỷ đơn #${order.id.slice(-8)}?\n\nKho sẽ được hoàn lại tương ứng với các sản phẩm trong đơn.`
      );
      if (!confirmed) return;
    }
    updateStatusMutation.mutate(status);
  };

  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Đơn #{order.id.slice(-8)}</span>
            <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {order.user.name} · {order.user.email}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {order.items.map((item) => item.productName).join(", ")}
          </p>
          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
          {updateStatusMutation.isError && (
            <p className="text-xs text-destructive">{getErrorMessage(updateStatusMutation.error)}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-semibold">{priceFormatter.format(order.totalAmount)}</span>
          {actions.length > 0 && (
            <div className="flex items-center gap-1">
              {actions.map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.destructive ? "outline" : "default"}
                  className={action.destructive ? "text-destructive hover:text-destructive" : undefined}
                  disabled={updateStatusMutation.isPending}
                  onClick={() => handleAction(action.status, action.destructive)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminOrderList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", "admin", page, status],
    queryFn: () => orderApi.adminList({ page, limit: 20, status }),
  });

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quản lý đơn hàng{data ? ` (${data.pagination.total})` : ""}</h1>
        <Select
          value={status ?? "all"}
          onValueChange={(next) => {
            setPage(1);
            setStatus(!next || next === "all" ? undefined : (next as OrderStatus));
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tất cả trạng thái">
              {status ? STATUS_LABEL[status] : "Tất cả trạng thái"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được danh sách đơn hàng.</p>}

      {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">Không có đơn hàng nào.</p>}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
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
