// Tầng: repository — nơi DUY NHẤT được import prisma và chạm DB cho NewsletterSubscriber.
import { prisma } from "../config/prisma";
import type { NewsletterSubscriber } from "@prisma/client";

interface UpsertSubscriberInput {
  email: string;
  phone?: string;
}

// upsert thay vì create: khách bấm đăng ký lần nữa (vd quên đã từng đăng ký) không nên
// văng lỗi 409 khó hiểu cho 1 form marketing — chỉ cần đảm bảo email là duy nhất trong bảng.
const upsertByEmail = ({ email, phone }: UpsertSubscriberInput): Promise<NewsletterSubscriber> => {
  return prisma.newsletterSubscriber.upsert({
    where: { email },
    update: phone ? { phone } : {},
    create: { email, phone },
  });
};

export const newsletterRepository = {
  upsertByEmail,
};
