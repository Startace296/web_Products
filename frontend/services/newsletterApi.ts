// Tầng: service — component chỉ được gọi API newsletter qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export interface SubscribeNewsletterPayload {
  email: string;
  phone?: string;
}

export const newsletterApi = {
  subscribe: async (payload: SubscribeNewsletterPayload): Promise<void> => {
    await api.post("/newsletter/subscribe", payload);
  },
};
