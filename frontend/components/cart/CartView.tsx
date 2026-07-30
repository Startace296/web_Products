"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cartApi, type CartItem } from "@/services/cartApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

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
    <div className="flex flex-col gap-2 border-b py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
            {item.name}
          </Link>
          <span className="text-sm text-muted-foreground">{priceFormatter.format(item.price)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() => removeMutation.mutate(item.productId)}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isPending || item.quantity <= 1}
            onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
          >
            <MinusIcon />
          </Button>
          <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isPending || atMax}
            onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
          >
            <PlusIcon />
          </Button>
        </div>
        <span className="font-medium">{priceFormatter.format(item.subtotal)}</span>
      </div>

      {(updateMutation.isError || removeMutation.isError) && (
        <p className="text-xs text-destructive">
          {getErrorMessage(updateMutation.error ?? removeMutation.error)}
        </p>
      )}
    </div>
  );
}

export function CartView() {
  const router = useRouter();
  const { data: cart, isLoading, isError } = useQuery({ queryKey: ["cart"], queryFn: cartApi.get });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Giỏ hàng</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được giỏ hàng.</p>}

      {cart && cart.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Giỏ hàng trống.{" "}
          <Link href="/" className="text-primary underline underline-offset-4">
            Tiếp tục xem sản phẩm
          </Link>
        </p>
      )}

      {cart && cart.items.length > 0 && (
        <Card>
          <CardContent className="flex flex-col">
            {cart.items.map((item) => (
              <CartRow key={item.productId} item={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {cart && cart.items.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Tổng cộng ({cart.totalItems} sản phẩm)</span>
            <span className="text-lg font-semibold">{priceFormatter.format(cart.totalAmount)}</span>
          </div>
          <Button onClick={() => router.push("/checkout")}>Tiến hành thanh toán</Button>
        </div>
      )}
    </div>
  );
}
