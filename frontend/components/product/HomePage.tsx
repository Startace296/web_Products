"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductHero } from "./ProductHero";
import { ProductList } from "./ProductList";
import { ProductRails } from "./ProductRails";
import { CategorySidebar } from "./CategorySidebar";
import { ProductCategoryFilter } from "./ProductCategoryFilter";
import { ProductPriceFilter } from "./ProductPriceFilter";
import { ProductPriceFilterSelect } from "./ProductPriceFilterSelect";
import { NewsletterPopup } from "@/components/marketing/NewsletterPopup";
import type { PriceRange } from "@/lib/priceBuckets";

// Search + category + price range được lift lên đây (thay vì để ProductList tự quản)
// vì Hero và sidebar đều cần điều khiển cùng state này.
export function HomePage() {
  // Đọc 1 lần lúc mount (lazy initializer) — vd: từ ProductBreadcrumb ở trang chi tiết
  // trỏ về "/?category=...". Chỉ set giá trị khởi tạo, KHÔNG đồng bộ tiếp sau đó: đổi
  // category bằng tay qua CategorySidebar/ProductCategoryFilter (client-only) không cần
  // (và không nên) đẩy ngược lên URL.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(() => searchParams.get("category") ?? undefined);
  const [priceRange, setPriceRange] = useState<PriceRange | undefined>(undefined);

  // Có search, chọn category, hoặc chọn mức giá -> chế độ "kết quả lọc" (grid). Ngược
  // lại -> chế độ "duyệt" mặc định, hiện 3 dải gợi ý theo yêu cầu ban đầu.
  const isFiltering = search.trim().length > 0 || !!category || !!priceRange;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <NewsletterPopup />
      <ProductHero value={search} onChange={setSearch} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-6">
          <CategorySidebar value={category} onChange={setCategory} />
          <ProductPriceFilter value={priceRange} onChange={setPriceRange} />
        </div>

        {/* Màn hình nhỏ không đủ chỗ cho sidebar dọc — dùng lại 2 dropdown gọn. */}
        <div className="flex flex-col gap-2 sm:flex-row lg:hidden">
          <ProductCategoryFilter value={category} onChange={setCategory} />
          <ProductPriceFilterSelect value={priceRange} onChange={setPriceRange} />
        </div>

        <div className="min-w-0 flex-1">
          {isFiltering ? (
            <ProductList search={search} category={category} priceRange={priceRange} />
          ) : (
            <ProductRails />
          )}
        </div>
      </div>
    </div>
  );
}
