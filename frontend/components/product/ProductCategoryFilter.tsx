"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";

interface ProductCategoryFilterProps {
  value: string | undefined;
  onChange: (category: string | undefined) => void;
}

export function ProductCategoryFilter({ value, onChange }: ProductCategoryFilterProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(!next || next === "all" ? undefined : next)}
    >
      <SelectTrigger className="w-48">
        {/* Truyền label tường minh — Base UI's SelectValue chỉ biết label sau khi
        SelectItem tương ứng đã mount ít nhất 1 lần, nên trước đó hiện value thô ("all"). */}
        <SelectValue placeholder="Tất cả danh mục">{value ?? "Tất cả danh mục"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả danh mục</SelectItem>
        {PRODUCT_CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
