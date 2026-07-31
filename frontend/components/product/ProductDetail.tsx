"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { productApi } from "@/services/productApi";
import { ReviewList } from "@/components/review/ReviewList";
import { ReviewForm } from "@/components/review/ReviewForm";
import { ProductImage } from "./ProductImage";
import { ProductSpecs } from "./ProductSpecs";
import { ProductBreadcrumb } from "./ProductBreadcrumb";

export function ProductDetail({ slug }: { slug: string }) {
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productApi.getBySlug(slug),
  });

  if (isLoading) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4 p-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return <p className="p-8 text-sm text-destructive">Không tìm thấy sản phẩm.</p>;
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-10 p-8">
      <ProductBreadcrumb category={product.category} brand={product.brand} productName={product.name} />

      <div className="grid gap-8 sm:grid-cols-2">
        <ProductImage product={product} className="aspect-square w-full rounded-2xl ring-1 ring-border" />

        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            {product.category}
          </Badge>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          {product.brand && <p className="text-sm text-muted-foreground">Thương hiệu: {product.brand}</p>}
          <p className="text-sm">{product.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span>⭐ {product.avgRating.toFixed(1)}</span>
            <span className="text-muted-foreground">{product.reviewCount} đánh giá</span>
          </div>
        </div>
      </div>

      <ProductSpecs specifications={product.specifications} />

      <div className="flex flex-col gap-6">
        <ReviewForm productId={product.id} slug={slug} />
        <ReviewList productId={product.id} />
      </div>
    </div>
  );
}
