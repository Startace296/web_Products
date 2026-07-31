"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import Link from "next/link";
import { BanknoteIcon, CreditCardIcon, MapPinIcon, PhoneIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cartApi } from "@/services/cartApi";
import { orderApi, type PaymentMethod } from "@/services/orderApi";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { cn } from "@/lib/utils";

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

const PAYMENT_OPTIONS: { value: PaymentMethod; icon: typeof BanknoteIcon; title: string; subtitle: string }[] = [
  { value: "COD", icon: BanknoteIcon, title: "Thanh toán khi nhận hàng", subtitle: "Trả tiền mặt (COD)" },
  { value: "VNPAY", icon: CreditCardIcon, title: "VNPay", subtitle: "Thẻ ATM/Visa/Master, QR" },
];

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
      <div className="flex w-full max-w-4xl flex-col gap-4 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex w-full max-w-4xl flex-col gap-4 p-8">
        <h1 className="text-2xl font-bold">Thanh toán</h1>
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
    <div className="flex w-full max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Thanh toán</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <form id="checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipientName">Người nhận</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                aria-invalid={!!fieldErrors.recipientName}
                autoComplete="name"
                className="h-11 rounded-xl pl-10"
              />
            </div>
            {fieldErrors.recipientName && <p className="text-sm text-destructive">{fieldErrors.recipientName}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipientPhone">Số điện thoại</Label>
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recipientPhone"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                aria-invalid={!!fieldErrors.recipientPhone}
                autoComplete="tel"
                placeholder="0912345678"
                className="h-11 rounded-xl pl-10"
              />
            </div>
            {fieldErrors.recipientPhone && <p className="text-sm text-destructive">{fieldErrors.recipientPhone}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shippingAddress">Địa chỉ giao hàng</Label>
            <div className="relative">
              <MapPinIcon className="pointer-events-none absolute top-3 left-3.5 size-4 text-muted-foreground" />
              <Textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                aria-invalid={!!fieldErrors.shippingAddress}
                autoComplete="street-address"
                rows={3}
                className="rounded-xl pl-10"
              />
            </div>
            {fieldErrors.shippingAddress && <p className="text-sm text-destructive">{fieldErrors.shippingAddress}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="rounded-xl"
            />
            {fieldErrors.note && <p className="text-sm text-destructive">{fieldErrors.note}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Phương thức thanh toán</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PAYMENT_OPTIONS.map(({ value, icon: Icon, title, subtitle }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    paymentMethod === value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      paymentMethod === value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </form>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-6">
          <h2 className="font-semibold">Đơn hàng ({cart.totalItems} sản phẩm)</h2>

          <div className="flex flex-col gap-2">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">
                  {item.name} <span className="tabular-nums">× {item.quantity}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">{priceFormatter.format(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-medium">Tổng cộng</span>
            <span className="text-lg font-bold text-destructive">{priceFormatter.format(cart.totalAmount)}</span>
          </div>

          <Button
            type="submit"
            form="checkout-form"
            disabled={createOrderMutation.isPending}
            className="h-11 w-full rounded-xl bg-accent text-base text-accent-foreground hover:bg-accent/90"
          >
            {createOrderMutation.isPending ? "Đang xử lý..." : "Đặt hàng"}
          </Button>
        </div>
      </div>
    </div>
  );
}
