import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "lucide-react";

interface ProductBreadcrumbProps {
  category: string;
  brand: string | null;
  productName: string;
}

// Home + category đều là link THẬT: category trỏ về "/?category=..." và HomePage đọc
// query này để lọc sẵn (xem HomePage.tsx) — không làm link "cho có" rồi không dẫn tới
// đâu. Brand thì CHỈ hiện dạng chữ (không phải link): backend/ProductList hiện chưa hỗ
// trợ lọc theo brand, nên không giả vờ có link dẫn tới trang không tồn tại.
export function ProductBreadcrumb({ category, brand, productName }: ProductBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/" className="flex items-center gap-1 transition-colors hover:text-foreground">
        <HomeIcon className="size-4" />
        Trang chủ
      </Link>

      <ChevronRightIcon className="size-3.5 shrink-0" />
      <Link href={`/?category=${encodeURIComponent(category)}`} className="transition-colors hover:text-foreground">
        {category}
      </Link>

      {brand && (
        <>
          <ChevronRightIcon className="size-3.5 shrink-0" />
          <span>{brand}</span>
        </>
      )}

      <ChevronRightIcon className="size-3.5 shrink-0" />
      <span className="truncate text-muted-foreground/70">{productName}</span>
    </nav>
  );
}
