"use client";

import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/productApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";

interface ProductListProps {
  // Điều khiển từ ProductHero / CategorySidebar (HomePage) — mặc định rỗng để component
  // vẫn dùng được độc lập.
  search?: string;
  category?: string;
}

export function ProductList({ search = "", category }: ProductListProps) {
  // Debounce only the value used for the query key/request — the raw value comes from
  // the parent-controlled `search` prop (typed into ProductHero) so typing feels instant.
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { category, search: debouncedSearch }],
    queryFn: () => productApi.list({ category, search: debouncedSearch || undefined }),
  });

  const title = debouncedSearch ? `Kết quả cho "${debouncedSearch}"` : category ? `Danh mục: ${category}` : "Sản phẩm";

  return (
    <div className="flex w-full flex-col gap-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được danh sách sản phẩm.</p>}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Không tìm thấy sản phẩm nào.</p>
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
