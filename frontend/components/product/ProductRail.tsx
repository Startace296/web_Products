"use client";

import { useQuery } from "@tanstack/react-query";
import { productApi, type ProductSortBy } from "@/services/productApi";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";

interface ProductRailProps {
  title: string;
  sortBy: ProductSortBy;
}

// Dải ngang: không dùng carousel/embla (chưa có sẵn trong project) — cuộn ngang thuần
// bằng overflow-x-auto là đủ cho 10 sản phẩm/dải.
export function ProductRail({ title, sortBy }: ProductRailProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "rail", sortBy],
    queryFn: () => productApi.list({ sortBy, limit: 10 }),
  });

  // 1 dải lỗi không nên kéo sập cả trang Home — các dải còn lại vẫn hiển thị bình thường.
  if (isError) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-56 shrink-0 rounded-lg" />)}

        {data?.items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có sản phẩm.</p>}

        {data?.items.map((product) => (
          <div key={product.id} className="w-56 shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
