"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reviewApi, type ReviewSortBy } from "@/services/reviewApi";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "./ReviewCard";

const SORT_OPTIONS: { value: ReviewSortBy; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "score", label: "Điểm cao nhất" },
];

// Chỉ hiển thị danh sách review — form viết review mới chưa nằm trong phạm vi bước này.
export function ReviewList({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ReviewSortBy>("newest");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reviews", productId, page, sortBy],
    queryFn: () => reviewApi.list({ productId, page, sortBy }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Đánh giá{data ? ` (${data.pagination.total})` : ""}</h2>
        <Select
          value={sortBy}
          onValueChange={(next) => {
            setSortBy((next as ReviewSortBy) || "newest");
            setPage(1); // đổi cách sắp thì quay về trang 1, tránh trang hiện tại vượt quá totalPages mới
          }}
        >
          <SelectTrigger className="w-44">
            {/* Truyền label tường minh thay vì để SelectValue tự suy ra — Base UI's
            Select chỉ biết label của item sau khi SelectItem đã mount ít nhất 1 lần,
            nên lần render đầu (trước khi user mở dropdown) sẽ hiện value thô ("newest")
            nếu không truyền children. */}
            <SelectValue>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được danh sách đánh giá.</p>}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có đánh giá nào cho sản phẩm này.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((review) => (
            <ReviewCard key={review.id} review={review} />
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
