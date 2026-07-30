"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { productApi, type Product } from "@/services/productApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

const priceFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

function ProductRow({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: () => productApi.remove(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleDelete = () => {
    // window.confirm thay vì dialog component riêng — project chưa có Dialog/AlertDialog
    // trong components/ui, và đây là hành động phá huỷ hiếm khi bấm nên không đáng thêm
    // 1 component mới chỉ cho việc này.
    const confirmed = window.confirm(
      `Xoá "${product.name}"?\n\nToàn bộ đánh giá của sản phẩm này sẽ bị xoá VĨNH VIỄN theo (cascade ở schema), không thể khôi phục. Đơn hàng cũ vẫn giữ nguyên vì đã lưu snapshot riêng.`
    );
    if (confirmed) {
      removeMutation.mutate();
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{product.name}</span>
            <Badge variant="secondary">{product.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {priceFormatter.format(product.price)} · Tồn kho: {product.stock} · {product.reviewCount} đánh giá
          </p>
          {removeMutation.isError && (
            <p className="text-xs text-destructive">{getErrorMessage(removeMutation.error)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href={`/admin/products/${product.slug}/edit`}>
            <Button variant="outline" size="icon-sm">
              <PencilIcon />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            disabled={removeMutation.isPending}
            onClick={handleDelete}
          >
            <Trash2Icon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminProductList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", "admin", page],
    queryFn: () => productApi.list({ page, limit: 20, sortBy: "newest" }),
  });

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quản lý sản phẩm{data ? ` (${data.pagination.total})` : ""}</h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <PlusIcon />
            Thêm sản phẩm
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được danh sách sản phẩm.</p>}

      {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào.</p>}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {data.pagination.page}/{data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
