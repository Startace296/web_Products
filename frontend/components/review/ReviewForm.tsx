"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewApi } from "@/services/reviewApi";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { cn } from "@/lib/utils";

// Mirror rules validate ở backend (validations/reviewValidation.ts createReviewSchema)
// để báo lỗi ngay, nhưng backend vẫn là nơi enforce thật.
const reviewSchema = z.object({
  rating: z.number().int().min(1, "Vui lòng chọn số sao").max(5),
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(150),
  content: z.string().trim().min(10, "Nội dung tối thiểu 10 ký tự").max(5000),
});

type FieldErrors = Partial<Record<"rating" | "title" | "content", string>>;

interface ReviewFormProps {
  productId: string;
  slug: string;
}

// Form cho người ĐÃ MUA/DÙNG sản phẩm viết đánh giá CỦA RIÊNG HỌ (title + rating +
// content, gọi POST /reviews) — khác với CommentList (chỉ cho bình luận/trả lời BÊN
// TRONG 1 review có sẵn của người khác, không tạo được review mới).
export function ReviewForm({ productId, slug }: ReviewFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: reviewApi.create,
    onSuccess: () => {
      setRating(0);
      setTitle("");
      setContent("");
      setFieldErrors({});
      // Danh sách review + avgRating/reviewCount hiện ở đầu trang chi tiết đều cần refetch.
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", slug] });
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, "Không gửi được đánh giá, vui lòng thử lại."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      router.push("/login");
      return;
    }

    const result = reviewSchema.safeParse({ rating, title, content });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    createMutation.mutate({ productId, ...result.data });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viết đánh giá của bạn</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  aria-label={`${value} sao`}
                  className="p-0.5"
                >
                  <StarIcon
                    className={cn(
                      "size-6 transition-colors",
                      value <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            {fieldErrors.rating && <p className="text-sm text-destructive">{fieldErrors.rating}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề đánh giá"
              aria-invalid={!!fieldErrors.title}
            />
            {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={user ? "Chia sẻ trải nghiệm của bạn về sản phẩm..." : "Đăng nhập để viết đánh giá"}
              rows={3}
              aria-invalid={!!fieldErrors.content}
            />
            {fieldErrors.content && <p className="text-sm text-destructive">{fieldErrors.content}</p>}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" disabled={createMutation.isPending} className="w-fit">
            {createMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
