// Tầng: service — component chỉ được gọi API vote qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export type VoteType = "UPVOTE" | "DOWNVOTE";

export interface ToggleVoteResult {
  vote: { type: VoteType } | null; // null nếu vừa bỏ vote (toggle off)
  upvoteCount: number;
  downvoteCount: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const voteApi = {
  toggle: async (reviewId: string, type: VoteType): Promise<ToggleVoteResult> => {
    const { data } = await api.post<ApiEnvelope<ToggleVoteResult>>(`/reviews/${reviewId}/votes`, { type });
    return data.data;
  },
};
