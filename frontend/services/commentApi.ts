// Tầng: service — component chỉ được gọi API comment qua đây, không import lib/axios trực tiếp.
// Chỉ có list() — tạo comment đi qua socket (hooks/useSocket.ts + CommentList), không
// qua REST, để phản ánh đúng luồng "tạo = sự kiện realtime" của bước này.
import { api } from "@/lib/axios";

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  reviewId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  user: CommentAuthor;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const commentApi = {
  list: async (reviewId: string): Promise<Comment[]> => {
    const { data } = await api.get<ApiEnvelope<Comment[]>>("/comments", { params: { reviewId } });
    return data.data;
  },
};
