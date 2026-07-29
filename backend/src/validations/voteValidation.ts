// Tầng: validation — Zod schema cho vote. Param :id của review dùng chung
// reviewIdParamSchema đã có ở validations/reviewValidation.ts.
import { z } from "zod";

export const toggleVoteSchema = z.object({
  type: z.enum(["UPVOTE", "DOWNVOTE"]),
});

export type ToggleVoteInput = z.infer<typeof toggleVoteSchema>;
