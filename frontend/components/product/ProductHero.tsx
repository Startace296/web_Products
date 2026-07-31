"use client";

import { CreditCardIcon, SearchIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProductHeroProps {
  value: string;
  onChange: (value: string) => void;
}

const TRUST_BADGES = [
  { icon: TruckIcon, label: "Giao nhanh miễn phí" },
  { icon: ShieldCheckIcon, label: "Bảo hành chính hãng" },
  { icon: CreditCardIcon, label: "Trả góp 0%" },
];

export function ProductHero({ value, onChange }: ProductHeroProps) {
  return (
    // class "dark" scope cục bộ (giống ProductCard): Hero luôn nền tối bất kể site có
    // bật dark mode toggle hay không (hiện chưa có toggle nào) — mọi token bên trong
    // (bg-background, text-foreground, bg-card, text-muted-foreground, border-border,
    // bg-primary, bg-accent...) tự động lấy đúng giá trị dark-mode đã tính WCAG AA sẵn.
    <section className="dark relative overflow-hidden rounded-3xl bg-background px-6 py-16 sm:px-10 sm:py-20">
      {/* Quầng sáng blur — thuần trang trí, không ảnh hưởng contrast chữ vì đứng sau
      (z-index mặc định theo thứ tự DOM) và bị che một phần bởi nội dung phía trên. */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase backdrop-blur">
          Công nghệ chính hãng
        </span>

        <h1 className="text-3xl font-bold text-balance text-foreground sm:text-4xl">
          Sản phẩm công nghệ, giá tốt mỗi ngày
        </h1>

        <p className="text-balance text-muted-foreground">
          Điện thoại, laptop, tai nghe chính hãng — giao nhanh, bảo hành đầy đủ, trả góp 0%.
        </p>

        {/* Ô search kính mờ (glassmorphism): nền bán trong suốt + backdrop-blur, để lộ
        quầng sáng phía sau. type="search" + preventDefault: input lọc kết quả trực tiếp
        khi gõ (debounce ở ProductList), form chỉ để Enter không reload trang. */}
        <form onSubmit={(e) => e.preventDefault()} className="relative w-full max-w-xl">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tìm iPhone, MacBook, tai nghe..."
            className="h-12 rounded-full border border-border bg-card/50 pr-4 pl-11 text-base text-foreground shadow-lg backdrop-blur-md placeholder:text-muted-foreground"
          />
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
