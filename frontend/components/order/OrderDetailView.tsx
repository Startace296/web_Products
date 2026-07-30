"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orderApi, type OrderStatus } from "@/services/orderApi";

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

const PAYMENT_METHOD_LABEL = { COD: "Thanh toán khi nhận hàng (COD)", VNPAY: "VNPay" };

// Poll tối đa ~10s khi đơn còn PENDING_PAYMENT — redirect trình duyệt /return và IPN
// server-to-server của VNPay không đảm bảo xử lý xong cùng lúc, nên trang có thể tới
// đây trước khi backend kịp cập nhật trạng thái từ IPN.
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 10_000;

interface OrderDetailViewProps {
  orderId: string;
  paymentResult?: "success" | "failed";
}

export function OrderDetailView({ orderId, paymentResult }: OrderDetailViewProps) {
  // Không dùng Date.now()/ref đọc lúc render (cả 2 đều bị react-hooks/purity và
  // react-hooks/refs cấm trong component). Cách hợp lệ theo React docs: effect chỉ
  // ĐĂNG KÝ 1 timer (external system), setState nằm trong callback của timer — không
  // phải đồng bộ trong thân effect — nên không bị react-hooks/set-state-in-effect.
  const [pollingExpired, setPollingExpired] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.getById(orderId),
    refetchInterval: (query) => {
      const stillPending = query.state.data?.status === "PENDING_PAYMENT";
      return stillPending && !pollingExpired ? POLL_INTERVAL_MS : false;
    },
  });

  useEffect(() => {
    if (order?.status !== "PENDING_PAYMENT") return;
    const timeout = setTimeout(() => setPollingExpired(true), MAX_POLL_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [order?.status]);

  if (isLoading) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return <p className="p-8 text-sm text-destructive">Không tìm thấy đơn hàng.</p>;
  }

  const stillWaitingAfterPoll = order.status === "PENDING_PAYMENT" && pollingExpired;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 p-8">
      {paymentResult === "success" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Thanh toán thành công.
        </div>
      )}
      {paymentResult === "failed" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircleIcon className="size-4 shrink-0" />
          Thanh toán thất bại hoặc đã bị huỷ.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Đơn hàng #{order.id.slice(-8)}</h1>
        <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>

      {stillWaitingAfterPoll && (
        <p className="text-sm text-muted-foreground">
          Chưa nhận được xác nhận thanh toán từ VNPay. Vui lòng tải lại trang sau ít phút.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span className="text-muted-foreground">{priceFormatter.format(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
            <span>Tổng cộng</span>
            <span>{priceFormatter.format(order.totalAmount)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Thanh toán: </span>
            {PAYMENT_METHOD_LABEL[order.paymentMethod]}
          </p>
          <p>
            <span className="text-muted-foreground">Người nhận: </span>
            {order.recipientName} · {order.recipientPhone}
          </p>
          <p>
            <span className="text-muted-foreground">Địa chỉ: </span>
            {order.shippingAddress}
          </p>
          {order.note && (
            <p>
              <span className="text-muted-foreground">Ghi chú: </span>
              {order.note}
            </p>
          )}
          <p className="text-muted-foreground">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
