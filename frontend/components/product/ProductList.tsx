"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/productApi";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";
import { ProductCategoryFilter } from "./ProductCategoryFilter";

export function ProductList() {
  const [category, setCategory] = useState<string | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { category }],
    queryFn: () => productApi.list({ category }),
  });

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sản phẩm</h1>
        <ProductCategoryFilter value={category} onChange={setCategory} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được danh sách sản phẩm.</p>}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
