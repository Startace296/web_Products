"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/hooks/useSocket";
import { commentApi, type Comment } from "@/services/commentApi";
import { useAuthStore } from "@/store/authStore";

interface AckResponse {
  success: boolean;
  data?: Comment;
  message?: string;
}

// Chỉ hỗ trợ comment phẳng (top-level) — parentId đã có sẵn ở backend cho reply,
// nhưng UI "trả lời 1 comment cụ thể" chưa nằm trong phạm vi bước này.
//
// Tạo comment đi qua socket.emit("comment:create", ..., ack) chứ không qua REST:
// việc thêm vào danh sách hiển thị CHỈ xảy ra khi nhận lại sự kiện "comment:new" từ
// server (kể cả comment của chính mình) — 1 luồng cập nhật danh sách duy nhất, không
// cần optimistic-append + de-dup riêng cho "comment của mình" như VoteButton.
export function CommentList({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const socket = useSocket();
  const user = useAuthStore((s) => s.user);

  const { data: initialComments, isLoading, isError } = useQuery({
    queryKey: ["comments", reviewId],
    queryFn: () => commentApi.list(reviewId),
  });

  // liveComments chỉ chứa comment nhận được QUA SOCKET sau khi mount — không sync
  // initialComments vào state cục bộ (tránh cần 1 effect chỉ để setState theo props/query,
  // đúng khuyến nghị react-hooks/set-state-in-effect). Danh sách hiển thị = gộp 2 nguồn
  // lúc render (useMemo bên dưới), có de-dup theo id.
  const [liveComments, setLiveComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const comments = useMemo(() => {
    const base = initialComments ?? [];
    const baseIds = new Set(base.map((c) => c.id));
    return [...base, ...liveComments.filter((c) => !baseIds.has(c.id))];
  }, [initialComments, liveComments]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("review:join", reviewId);

    const handleNewComment = (comment: Comment) => {
      if (comment.reviewId !== reviewId) return;
      // setState ở đây nằm trong callback của sự kiện socket, không đồng bộ trong thân
      // effect — đây là "subscribe, setState khi có update từ hệ thống ngoài", đúng
      // pattern react-hooks/set-state-in-effect khuyến khích (khác ví dụ bị chặn ở trên).
      setLiveComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
    };

    socket.on("comment:new", handleNewComment);

    return () => {
      socket.emit("review:leave", reviewId);
      socket.off("comment:new", handleNewComment);
    };
  }, [socket, reviewId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push("/login");
      return;
    }
    if (!socket || !content.trim() || sending) return;

    setSending(true);
    setFormError(null);

    socket.emit("comment:create", { reviewId, content: content.trim() }, (response: AckResponse) => {
      setSending(false);
      if (response.success) {
        setContent("");
      } else {
        setFormError(response.message ?? "Không gửi được bình luận.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Không tải được bình luận.</p>}

      {!isLoading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có bình luận nào.</p>
      )}

      <div className="flex flex-col gap-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2">
            <Avatar className="size-7">
              <AvatarImage src={comment.user.avatarUrl ?? undefined} alt={comment.user.name} />
              <AvatarFallback className="text-xs">{comment.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium">{comment.user.name}</p>
              <p className="text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"}
          rows={2}
          disabled={!socket}
        />
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" size="sm" className="w-fit" disabled={!socket || sending || !content.trim()}>
          {sending ? "Đang gửi..." : "Gửi"}
        </Button>
      </form>
    </div>
  );
}
