"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MinusIcon, PlusIcon, ShieldCheckIcon, ShoppingCartIcon, Trash2Icon, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cartApi, type CartItem } from "@/services/cartApi";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { ProductImage } from "@/components/product/ProductImage";

const priceFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

function CartRow({ item }: { item: CartItem }) {
  const queryClient = useQueryClient();

  // Dùng chung 1 mutation cho +/- của MỌI dòng trong giỏ (không phải 1 mutation/dòng):
  // click liên tiếp giữa các dòng nhờ vậy được tuần tự hoá thay vì bắn nhiều request
  // song song có thể ghi đè lẫn nhau (mỗi response là CartSummary đầy đủ, ai trả sau
  // thắng) — cái giá đánh đổi là các dòng khác cũng tạm khoá nút trong lúc chờ.
  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.updateItem(productId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(["cart"], cart),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: (cart) => queryClient.setQueryData(["cart"], cart),
  });

  const isPending = updateMutation.isPending || removeMutation.isPending;
  const atMax = item.quantity >= 10 || item.quantity >= item.stock;

  return (
    <div className="flex gap-4 border-b border-border py-4 last:border-b-0">
      <Link href={`/products/${item.slug}`} className="shrink-0">
        <ProductImage product={item} className="size-20 rounded-xl ring-1 ring-border" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={`/products/${item.slug}`} className="truncate font-medium hover:text-primary">
              {item.name}
            </Link>
            <span className="text-sm text-muted-foreground">{priceFormatter.format(item.price)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            disabled={isPending}
            onClick={() => removeMutation.mutate(item.productId)}
            aria-label="Xoá khỏi giỏ hàng"
          >
            <Trash2Icon />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center overflow-hidden rounded-full border border-border">
            <button
              type="button"
              disabled={isPending || item.quantity <= 1}
              onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
              className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Giảm số lượng"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
            <button
              type="button"
              disabled={isPending || atMax}
              onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
              className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Tăng số lượng"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
          <span className="font-semibold text-destructive">{priceFormatter.format(item.subtotal)}</span>
        </div>

        {(updateMutation.isError || removeMutation.isError) && (
          <p className="text-xs text-destructive">{getErrorMessage(updateMutation.error ?? removeMutation.error)}</p>
        )}
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShoppingCartIcon className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">Giỏ hàng của bạn đang trống</p>
        <p className="text-sm text-muted-foreground">Thêm sản phẩm yêu thích để bắt đầu đặt hàng.</p>
      </div>
      <Link href="/">
        <Button className="mt-2">Tiếp tục mua sắm</Button>
      </Link>
    </div>
  );
}

export function CartView() {
  const router = useRouter();
  const { data: cart, isLoading, isError } = useQuery({ queryKey: ["cart"], queryFn: cartApi.get });

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">Giỏ hàng</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được giỏ hàng.</p>}

      {cart && cart.items.length === 0 && <EmptyCart />}

      {cart && cart.items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="flex flex-col rounded-2xl border border-border bg-card px-5">
            {cart.items.map((item) => (
              <CartRow key={item.productId} item={item} />
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-6">
            <h2 className="font-semibold">Tóm tắt đơn hàng</h2>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Số lượng</span>
              <span className="font-medium tabular-nums">{cart.totalItems} sản phẩm</span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium">Tổng cộng</span>
              <span className="text-lg font-bold text-destructive">{priceFormatter.format(cart.totalAmount)}</span>
            </div>

            <Button
              className="h-11 w-full rounded-xl bg-accent text-base text-accent-foreground hover:bg-accent/90"
              onClick={() => router.push("/checkout")}
            >
              Tiến hành thanh toán
            </Button>

            <div className="flex flex-col gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <TruckIcon className="size-3.5" />
                Giao nhanh miễn phí
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5" />
                Bảo hành chính hãng
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
