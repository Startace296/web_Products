import { cn } from "@/lib/utils";
import type { ProductSpecification } from "@/services/productApi";

// Ẩn hẳn cả section khi chưa có dữ liệu — không hiện khung rỗng/"Chưa có thông số" (admin
// nào chưa nhập thì sản phẩm đó đơn giản là không có mục này, giống cách brand/originalPrice
// đang được xử lý ở ProductDetail).
export function ProductSpecs({ specifications }: { specifications: ProductSpecification[] | null }) {
  if (!specifications || specifications.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Thông số kỹ thuật</h2>
      <div className="overflow-hidden rounded-xl border border-border">
        {specifications.map((spec, index) => (
          <div
            key={spec.label}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 px-4 py-2.5 text-sm",
              index % 2 === 1 && "bg-muted/40"
            )}
          >
            <span className="text-muted-foreground">{spec.label}</span>
            <span className="font-medium text-foreground">{spec.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
