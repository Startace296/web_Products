"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { productApi } from "@/services/productApi";
import { buildPriceBuckets, type PriceBucket, type PriceRange } from "@/lib/priceBuckets";

interface ProductPriceFilterProps {
  value: PriceRange | undefined;
  onChange: (range: PriceRange | undefined) => void;
  className?: string;
}

const isSameBucket = (value: PriceRange | undefined, bucket: PriceBucket): boolean =>
  !!value && value.min === bucket.min && value.max === bucket.max;

// Sidebar dọc cho desktop — cùng cách trình bày và contract onChange với
// CategorySidebar, chỉ khác nguồn dữ liệu: mốc giá tính động từ GET /products/price-range
// (xem lib/priceBuckets.ts) thay vì danh sách cố định như category.
export function ProductPriceFilter({ value, onChange, className }: ProductPriceFilterProps) {
  // staleTime dài — khoảng giá toàn catalog gần như không đổi theo từng phút, không cần
  // refetch mỗi lần quay lại trang như query danh sách sản phẩm.
  const { data } = useQuery({
    queryKey: ["products", "price-range"],
    queryFn: productApi.getPriceRange,
    staleTime: 5 * 60 * 1000,
  });

  const buckets = data ? buildPriceBuckets(data.max) : [];
  if (buckets.length === 0) return null;

  return (
    <aside className={cn("w-48 shrink-0", className)}>
      <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Mức giá</p>
      <nav className="flex flex-col gap-1">
        <Button variant={!value ? "secondary" : "ghost"} className="justify-start" onClick={() => onChange(undefined)}>
          Tất cả
        </Button>
        {buckets.map((bucket) => (
          <Button
            key={bucket.label}
            variant={isSameBucket(value, bucket) ? "secondary" : "ghost"}
            className="justify-start"
            onClick={() => onChange({ min: bucket.min, max: bucket.max })}
          >
            {bucket.label}
          </Button>
        ))}
      </nav>
    </aside>
  );
}
