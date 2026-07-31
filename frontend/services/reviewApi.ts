// Tầng: service — component chỉ được gọi API review qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export interface ReviewAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  userId: string;
  productId: string;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: string;
  updatedAt: string;
  user: ReviewAuthor;
}

export type ReviewSortBy = "newest" | "score";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListEnvelope<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

interface DetailEnvelope<T> {
  success: boolean;
  data: T;
}

export interface CreateReviewPayload {
  productId: string;
  title: string;
  content: string;
  rating: number;
}

export interface ListReviewsParams {
  productId: string;
  page?: number;
  limit?: number;
  sortBy?: ReviewSortBy;
}

export interface ListReviewsResult {
  items: Review[];
  pagination: Pagination;
}

export const reviewApi = {
  list: async (params: ListReviewsParams): Promise<ListReviewsResult> => {
    const { data } = await api.get<ListEnvelope<Review>>("/reviews", { params });
    return { items: data.data, pagination: data.pagination };
  },

  create: async (payload: CreateReviewPayload): Promise<Review> => {
    const { data } = await api.post<DetailEnvelope<Review>>("/reviews", payload);
    return data.data;
  },
};
