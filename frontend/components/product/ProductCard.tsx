import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/services/productApi";

// Chưa render ảnh: imageUrl trong seed data là domain giả (images.example.com),
// dùng next/image sẽ phải cấu hình remotePatterns cho 1 domain không có thật — bỏ qua
// cho tới khi có ảnh sản phẩm thật.
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="block h-full">
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            {product.category}
          </Badge>
          <CardTitle className="mt-2">{product.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between text-sm">
          <span>⭐ {product.avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground">{product.reviewCount} đánh giá</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
