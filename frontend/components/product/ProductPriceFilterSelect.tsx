"use client";

import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productApi } from "@/services/productApi";
import { buildPriceBuckets, type PriceRange } from "@/lib/priceBuckets";

interface ProductPriceFilterSelectProps {
  value: PriceRange | undefined;
  onChange: (range: PriceRange | undefined) => void;
}

// Bản dropdown gọn cho màn hình nhỏ — cùng dữ liệu mốc giá với ProductPriceFilter
// (sidebar dọc desktop), chỉ khác cách trình bày, giống cặp CategorySidebar/
// ProductCategoryFilter. Value của Select phải là string nên mã hoá mỗi mốc bằng
// index trong mảng buckets thay vì tự ráp chuỗi từ min/max.
export function ProductPriceFilterSelect({ value, onChange }: ProductPriceFilterSelectProps) {
  const { data } = useQuery({
    queryKey: ["products", "price-range"],
    queryFn: productApi.getPriceRange,
    staleTime: 5 * 60 * 1000,
  });

  const buckets = data ? buildPriceBuckets(data.max) : [];
  if (buckets.length === 0) return null;

  const selectedIndex = value ? buckets.findIndex((b) => b.min === value.min && b.max === value.max) : -1;
  const currentLabel = selectedIndex === -1 ? "Tất cả mức giá" : buckets[selectedIndex].label;

  const handleChange = (next: string | null) => {
    if (!next || next === "all") {
      onChange(undefined);
      return;
    }
    const bucket = buckets[Number(next)];
    onChange(bucket ? { min: bucket.min, max: bucket.max } : undefined);
  };

  return (
    <Select value={selectedIndex === -1 ? "all" : String(selectedIndex)} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Tất cả mức giá">{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả mức giá</SelectItem>
        {buckets.map((bucket, index) => (
          <SelectItem key={bucket.label} value={String(index)}>
            {bucket.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
