"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlameIcon, ShoppingCartIcon, StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cartApi } from "@/services/cartApi";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { cn } from "@/lib/utils";
import type { Product } from "@/services/productApi";

const priceFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

// Ngưỡng gắn nhãn "Hot" — heuristic đơn giản, hiệu chỉnh theo quy mô dữ liệu review
// hiện có (còn nhỏ, mới đang phát triển tính năng review). Nâng con số này lên khi
// lượng review thật tăng, tránh gần như mọi sản phẩm đều bị gắn Hot.
const HOT_REVIEW_THRESHOLD = 3;

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={cn("size-3.5", i < rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

// Chưa render ảnh: imageUrl trong seed data là domain giả (images.example.com),
// dùng next/image sẽ phải cấu hình remotePatterns cho 1 domain không có thật — bỏ qua
// cho tới khi có ảnh sản phẩm thật.
export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const addToCart = useMutation({
    mutationFn: () => cartApi.addItem(product.id, 1),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });

  // Toàn bộ Card nằm trong 1 <Link> (xem bên dưới) — bắt buộc chặn navigate + không cho
  // sự kiện click nổi lên <a> khi bấm nút, nếu không click "Thêm giỏ" sẽ điều hướng luôn
  // sang trang chi tiết sản phẩm.
  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }
    addToCart.mutate();
  };

  const outOfStock = product.stock <= 0;
  const isHot = product.reviewCount >= HOT_REVIEW_THRESHOLD;

  return (
    <Link href={`/products/${product.slug}`} className="block h-full">
      <Card className="relative h-full transition-colors hover:border-primary">
        {isHot && (
          <Badge variant="destructive" className="absolute top-3 right-3 z-10 gap-1">
            <FlameIcon />
            Hot
          </Badge>
        )}
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            {product.category}
          </Badge>
          <CardTitle className="mt-2">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          <p className="font-semibold">{priceFormatter.format(product.price)}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <StarRating rating={product.avgRating} />
              <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              disabled={outOfStock || addToCart.isPending}
              onClick={handleAddToCart}
            >
              <ShoppingCartIcon />
              {outOfStock ? "Hết hàng" : "Thêm giỏ"}
            </Button>
          </div>
          {addToCart.isError && <p className="text-xs text-destructive">{getErrorMessage(addToCart.error)}</p>}
        </CardFooter>
      </Card>
    </Link>
  );
}
