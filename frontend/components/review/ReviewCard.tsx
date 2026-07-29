"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Review } from "@/services/reviewApi";
import { VoteButton } from "./VoteButton";
import { CommentList } from "./CommentList";

export function ReviewCard({ review }: { review: Review }) {
  // Đóng/mở bằng render có điều kiện (không phải ẩn qua CSS) — CommentList chỉ mount,
  // tức chỉ join room Socket.IO, khi thực sự đang xem bình luận của review này. Nếu
  // luôn mount sẵn cho mọi review trong danh sách, mỗi client sẽ join room của TẤT
  // CẢ review đang hiển thị dù không quan tâm, làm mất tác dụng của "room theo review_id".
  const [showComments, setShowComments] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage src={review.user.avatarUrl ?? undefined} alt={review.user.name} />
            <AvatarFallback>{review.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{review.user.name}</p>
            <p className="text-xs text-muted-foreground">
              {"⭐".repeat(review.rating)} · {new Date(review.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <VoteButton
          reviewId={review.id}
          initialUpvoteCount={review.upvoteCount}
          initialDownvoteCount={review.downvoteCount}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-medium">{review.title}</p>
        <p className="text-sm text-muted-foreground">{review.content}</p>

        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          onClick={() => setShowComments((prev) => !prev)}
        >
          <MessageCircle />
          {showComments ? "Ẩn bình luận" : "Bình luận"}
        </Button>

        {showComments && <CommentList reviewId={review.id} />}
      </CardContent>
    </Card>
  );
}
