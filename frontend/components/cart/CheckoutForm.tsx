"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cartApi } from "@/services/cartApi";
import { orderApi, type PaymentMethod } from "@/services/orderApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

const priceFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

// Mirror rules validate ở backend (validations/orderValidation.ts) để báo lỗi ngay,
// nhưng backend vẫn là nơi enforce thật — đây chỉ là UX.
const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2, "Tên người nhận phải có ít nhất 2 ký tự").max(100),
  recipientPhone: z.string().trim().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  shippingAddress: z.string().trim().min(10, "Địa chỉ giao hàng quá ngắn").max(500),
  note: z.string().trim().max(500).optional(),
});

type FieldErrors = Partial<Record<"recipientName" | "recipientPhone" | "shippingAddress" | "note", string>>;

export function CheckoutForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: cart, isLoading: isCartLoading } = useQuery({ queryKey: ["cart"], queryFn: cartApi.get });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: orderApi.create,
    onSuccess: ({ order, paymentUrl }) => {
      // Backend đã xoá giỏ hàng khi tạo đơn (cả COD lẫn VNPAY) — báo cho cache biết để
      // badge giỏ hàng ở Navbar không hiện số cũ.
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      if (paymentUrl) {
        // Rời hẳn SPA sang cổng thanh toán VNPay — không phải route nội bộ nên không
        // dùng router.push.
        window.location.href = paymentUrl;
        return;
      }
      router.push(`/orders/${order.id}`);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, "Đặt hàng thất bại, vui lòng thử lại."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = checkoutSchema.safeParse({ recipientName, recipientPhone, shippingAddress, note });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    createOrderMutation.mutate({
      paymentMethod,
      recipientName: result.data.recipientName,
      recipientPhone: result.data.recipientPhone,
      shippingAddress: result.data.shippingAddress,
      note: result.data.note || undefined,
    });
  };

  if (isCartLoading) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Thanh toán</h1>
        <p className="text-sm text-muted-foreground">
          Giỏ hàng trống.{" "}
          <Link href="/" className="text-primary underline underline-offset-4">
            Tiếp tục xem sản phẩm
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Thanh toán</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đơn hàng ({cart.totalItems} sản phẩm)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="text-muted-foreground">{priceFormatter.format(item.subtotal)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold">
            <span>Tổng cộng</span>
            <span>{priceFormatter.format(cart.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recipientName">Người nhận</Label>
          <Input
            id="recipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            aria-invalid={!!fieldErrors.recipientName}
            autoComplete="name"
          />
          {fieldErrors.recipientName && <p className="text-sm text-destructive">{fieldErrors.recipientName}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recipientPhone">Số điện thoại</Label>
          <Input
            id="recipientPhone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            aria-invalid={!!fieldErrors.recipientPhone}
            autoComplete="tel"
            placeholder="0912345678"
          />
          {fieldErrors.recipientPhone && <p className="text-sm text-destructive">{fieldErrors.recipientPhone}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shippingAddress">Địa chỉ giao hàng</Label>
          <Textarea
            id="shippingAddress"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            aria-invalid={!!fieldErrors.shippingAddress}
            autoComplete="street-address"
            rows={3}
          />
          {fieldErrors.shippingAddress && <p className="text-sm text-destructive">{fieldErrors.shippingAddress}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note">Ghi chú (tuỳ chọn)</Label>
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          {fieldErrors.note && <p className="text-sm text-destructive">{fieldErrors.note}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Phương thức thanh toán</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={paymentMethod === "COD" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setPaymentMethod("COD")}
            >
              Thanh toán khi nhận hàng (COD)
            </Button>
            <Button
              type="button"
              variant={paymentMethod === "VNPAY" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setPaymentMethod("VNPAY")}
            >
              VNPay
            </Button>
          </div>
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <Button type="submit" disabled={createOrderMutation.isPending} className="w-full">
          {createOrderMutation.isPending ? "Đang xử lý..." : "Đặt hàng"}
        </Button>
      </form>
    </div>
  );
}
