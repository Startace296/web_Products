"use client";

import { useState } from "react";
import Image from "next/image";
import { HeadphonesIcon, LaptopIcon, PackageIcon, SmartphoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/services/productApi";

// Icon + nền pastel theo từng category — thay cho ảnh khi sản phẩm chưa có ảnh thật
// hoặc ảnh load lỗi. Trung thực hơn ảnh placeholder chung chung (không phải ảnh giả
// trông như thật), và không phụ thuộc dịch vụ ngoài (đã bỏ placehold.co).
const CATEGORY_PLACEHOLDER: Record<string, { icon: typeof SmartphoneIcon; className: string }> = {
  Smartphone: { icon: SmartphoneIcon, className: "bg-blue-50 text-blue-400" },
  Laptop: { icon: LaptopIcon, className: "bg-emerald-50 text-emerald-400" },
  Audio: { icon: HeadphonesIcon, className: "bg-orange-50 text-orange-400" },
};
const DEFAULT_PLACEHOLDER = { icon: PackageIcon, className: "bg-neutral-100 text-neutral-400" };

interface ProductImageProps {
  product: Pick<Product, "imageUrl" | "name" | "category">;
  className?: string;
  iconClassName?: string;
}

// Dùng chung giữa ProductCard (lưới) và ProductDetail (trang chi tiết) — cùng 1 logic
// "ảnh thật hay placeholder theo category", để ảnh lỗi/thiếu luôn hiển thị nhất quán
// ở mọi nơi thay vì mỗi nơi tự cài lại.
export function ProductImage({ product, className, iconClassName }: ProductImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasRealImage = product.imageUrl != null && !imageFailed;

  if (hasRealImage) {
    return (
      <div className={cn("flex items-center justify-center overflow-hidden bg-white p-4", className)}>
        <Image
          src={product.imageUrl!}
          alt={product.name}
          width={600}
          height={600}
          // Luôn bỏ qua Image Optimization: imageUrl do ADMIN nhập tay nên có thể là bất
          // kỳ domain nào — xem lý do đầy đủ ở lịch sử ProductCard.tsx.
          unoptimized
          className="size-full object-contain"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const { icon: Icon, className: placeholderClassName } = CATEGORY_PLACEHOLDER[product.category] ?? DEFAULT_PLACEHOLDER;
  return (
    <div className={cn("flex items-center justify-center overflow-hidden", placeholderClassName, className)}>
      <Icon className={cn("size-16", iconClassName)} strokeWidth={1.5} />
    </div>
  );
}
