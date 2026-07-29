"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { voteApi, type VoteType } from "@/services/voteApi";
import { useAuthStore } from "@/store/authStore";

interface VoteState {
  myVote: VoteType | null;
  upvoteCount: number;
  downvoteCount: number;
}

// Mô phỏng lại đúng logic toggle của backend (services/voteService.ts) để tính trước
// kết quả, không chờ round-trip server: bấm lại cùng loại -> bỏ vote; bấm loại khác ->
// đổi chiều; chưa vote -> tạo mới.
function computeOptimistic(state: VoteState, clicked: VoteType): VoteState {
  const { myVote, upvoteCount, downvoteCount } = state;

  if (myVote === clicked) {
    return {
      myVote: null,
      upvoteCount: clicked === "UPVOTE" ? upvoteCount - 1 : upvoteCount,
      downvoteCount: clicked === "DOWNVOTE" ? downvoteCount - 1 : downvoteCount,
    };
  }

  if (myVote === null) {
    return {
      myVote: clicked,
      upvoteCount: clicked === "UPVOTE" ? upvoteCount + 1 : upvoteCount,
      downvoteCount: clicked === "DOWNVOTE" ? downvoteCount + 1 : downvoteCount,
    };
  }

  return {
    myVote: clicked,
    upvoteCount: clicked === "UPVOTE" ? upvoteCount + 1 : upvoteCount - 1,
    downvoteCount: clicked === "DOWNVOTE" ? downvoteCount + 1 : downvoteCount - 1,
  };
}

interface VoteButtonProps {
  reviewId: string;
  initialUpvoteCount: number;
  initialDownvoteCount: number;
}

// Giới hạn đã biết: sau khi load lại trang, nút không tự hiển thị vote đã có từ phiên
// trước (myVote khởi tạo null) — vì endpoint GET /reviews vẫn public, không biết current
// user là ai. Chỉ phản ánh đúng trạng thái cho các lượt vote trong phiên hiện tại.
export function VoteButton({ reviewId, initialUpvoteCount, initialDownvoteCount }: VoteButtonProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<VoteState>({
    myVote: null,
    upvoteCount: initialUpvoteCount,
    downvoteCount: initialDownvoteCount,
  });

  const voteMutation = useMutation({
    mutationFn: (type: VoteType) => voteApi.toggle(reviewId, type),
    onMutate: (type) => {
      const previous = state;
      setState((current) => computeOptimistic(current, type));
      return { previous };
    },
    onError: (_err, _type, context) => {
      // Rollback về trạng thái trước khi optimistic-update nếu request thật thất bại.
      if (context) setState(context.previous);
    },
    onSuccess: (result) => {
      // Đồng bộ lại với response thật từ server — nguồn sự thật cuối cùng.
      setState({ myVote: result.vote?.type ?? null, upvoteCount: result.upvoteCount, downvoteCount: result.downvoteCount });
    },
  });

  const handleClick = (type: VoteType) => {
    if (!user) {
      router.push("/login");
      return;
    }
    voteMutation.mutate(type);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-pressed={state.myVote === "UPVOTE"}
        disabled={voteMutation.isPending}
        onClick={() => handleClick("UPVOTE")}
        className={cn(state.myVote === "UPVOTE" && "text-primary")}
      >
        <ArrowBigUp className={cn(state.myVote === "UPVOTE" && "fill-current")} />
      </Button>
      <span className="min-w-6 text-center text-sm tabular-nums">
        {state.upvoteCount - state.downvoteCount}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-pressed={state.myVote === "DOWNVOTE"}
        disabled={voteMutation.isPending}
        onClick={() => handleClick("DOWNVOTE")}
        className={cn(state.myVote === "DOWNVOTE" && "text-destructive")}
      >
        <ArrowBigDown className={cn(state.myVote === "DOWNVOTE" && "fill-current")} />
      </Button>
    </div>
  );
}
