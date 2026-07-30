"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";

interface CategorySidebarProps {
  value: string | undefined;
  onChange: (category: string | undefined) => void;
  className?: string;
}

// Sidebar dọc cho desktop — cùng danh sách category và cùng contract onChange với
// ProductCategoryFilter (dropdown dùng ở màn hình nhỏ, xem HomePage.tsx), chỉ khác
// cách trình bày.
export function CategorySidebar({ value, onChange, className }: CategorySidebarProps) {
  return (
    <aside className={cn("w-48 shrink-0", className)}>
      <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Danh mục</p>
      <nav className="flex flex-col gap-1">
        <Button
          variant={!value ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => onChange(undefined)}
        >
          Tất cả danh mục
        </Button>
        {PRODUCT_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={value === category ? "secondary" : "ghost"}
            className="justify-start"
            onClick={() => onChange(category)}
          >
            {category}
          </Button>
        ))}
      </nav>
    </aside>
  );
}
