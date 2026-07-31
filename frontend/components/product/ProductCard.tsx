"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlameIcon, ShoppingCartIcon, SparklesIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cartApi } from "@/services/cartApi";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { cn } from "@/lib/utils";
import type { Product } from "@/services/productApi";
import { ProductImage } from "./ProductImage";

const priceFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

// Ngưỡng gắn nhãn "Hot" — heuristic đơn giản, hiệu chỉnh theo quy mô dữ liệu review
// hiện có (còn nhỏ, mới đang phát triển tính năng review). Nâng con số này lên khi
// lượng review thật tăng, tránh gần như mọi sản phẩm đều bị gắn Hot.
const HOT_REVIEW_THRESHOLD = 3;
// Ngưỡng gắn nhãn "Mới" — sản phẩm tạo trong N ngày gần đây.
const NEW_PRODUCT_DAYS = 14;
// Tính 1 lần lúc module load (không phải trong thân component) — Date.now() gọi trực
// tiếp lúc render bị react-hooks/purity chặn (đã gặp lỗi này ở OrderDetailView.tsx),
// và badge "Mới" không cần chính xác tới từng giây nên mốc thời điểm trang được tải
// là đủ dùng.
const NOW = Date.now();

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
  const isNew = !isHot && NOW - new Date(product.createdAt).getTime() < NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
  // Dữ liệu thật (Product.originalPrice) — không bịa giá gốc/% giảm giả. Chỉ hiện khi
  // originalPrice lớn hơn price thật sự (0 hoặc âm không có nghĩa gì để hiện badge).
  const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice!) * 100) : 0;

  return (
    <Link href={`/products/${product.slug}`} className="block h-full">
      {/* class "dark" scope cục bộ: mọi token (bg-card, text-card-foreground,
      text-muted-foreground, bg-secondary, bg-accent, bg-primary...) bên trong tự động
      lấy giá trị dark-mode đã tính WCAG AA sẵn ở globals.css — không cần bịa màu mới,
      không phụ thuộc site có bật dark mode toggle hay không (hiện chưa có toggle nào). */}
      <Card className="dark relative h-full overflow-hidden transition-colors hover:border-primary">
        <div className="relative">
          {/* Badge % giảm và Hot/Mới dùng nền ĐẶC (không phải variant translucent của
          Badge) — đè lên ảnh sản phẩm thật có màu bất kỳ, nền trong suốt dễ chìm/khó đọc
          tuỳ ảnh, nền đặc luôn đọc rõ bất kể phía sau là gì. */}
          {hasDiscount && (
            <span className="absolute top-2 left-2 z-10 rounded-md bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
              -{discountPercent}%
            </span>
          )}
          {isHot && (
            <span className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
              <FlameIcon className="size-3" />
              Hot
            </span>
          )}
          {!isHot && isNew && (
            <span className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              <SparklesIcon className="size-3" />
              Mới
            </span>
          )}
          {/* Ảnh/placeholder bọc riêng, KHÔNG phải con trực tiếp của Card (phá vỡ trick
          tự bo góc img:first-child) nên bo góc thủ công (rounded-t-xl). */}
          <ProductImage product={product} className="aspect-[4/3] w-full rounded-t-xl" />
        </div>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              {product.category}
            </Badge>
            <CardTitle>{product.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-destructive">{priceFormatter.format(product.price)}</p>
            {hasDiscount && (
              <p className="text-sm text-muted-foreground line-through">
                {priceFormatter.format(product.originalPrice!)}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <StarRating rating={product.avgRating} />
              <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
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
