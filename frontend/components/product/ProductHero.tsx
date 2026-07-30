"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProductHeroProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductHero({ value, onChange }: ProductHeroProps) {
  return (
    <section className="overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-10 sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="text-sm font-medium text-primary-foreground/70">
          Nền tảng đánh giá sản phẩm công nghệ
        </span>
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
          Trước khi mua, xem người dùng thật nói gì
        </h1>
        <p className="text-balance text-primary-foreground/80">
          TechPulse tổng hợp đánh giá thực tế theo từng sản phẩm — không bán hàng,
          không giỏ hàng, chỉ có thông tin bạn cần để quyết định.
        </p>

        {/* type="search" + preventDefault: input lọc kết quả trực tiếp khi gõ (debounce ở
        ProductList), form chỉ để Enter không reload trang. */}
        <form onSubmit={(e) => e.preventDefault()} className="relative w-full max-w-xl">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tìm smartphone, laptop, tai nghe... để xem đánh giá"
            className="h-12 rounded-full border-0 bg-background pr-4 pl-11 text-base text-foreground shadow-sm"
          />
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-primary-foreground/70">
          <span>🔎 Đánh giá minh bạch</span>
          <span>🧑‍🤝‍🧑 Từ cộng đồng người dùng thật</span>
          <span>🚫 Không bán hàng, không giỏ hàng</span>
        </div>
      </div>
    </section>
  );
}
