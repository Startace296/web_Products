"use client";

import { useState } from "react";
import { ProductHero } from "./ProductHero";
import { ProductList } from "./ProductList";
import { ProductRails } from "./ProductRails";
import { CategorySidebar } from "./CategorySidebar";
import { ProductCategoryFilter } from "./ProductCategoryFilter";

// Search + category được lift lên đây (thay vì để ProductList tự quản) vì Hero và
// sidebar đều cần điều khiển cùng state này.
export function HomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);

  // Có search hoặc chọn category -> chế độ "kết quả lọc" (grid). Ngược lại -> chế độ
  // "duyệt" mặc định, hiện 3 dải gợi ý theo yêu cầu ban đầu.
  const isFiltering = search.trim().length > 0 || !!category;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <ProductHero value={search} onChange={setSearch} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <CategorySidebar value={category} onChange={setCategory} className="hidden lg:sticky lg:top-6 lg:block" />

        {/* Màn hình nhỏ không đủ chỗ cho sidebar dọc — dùng lại dropdown category. */}
        <div className="lg:hidden">
          <ProductCategoryFilter value={category} onChange={setCategory} />
        </div>

        <div className="min-w-0 flex-1">{isFiltering ? <ProductList search={search} category={category} /> : <ProductRails />}</div>
      </div>
    </div>
  );
}
