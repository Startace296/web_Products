// Tầng: validation — Zod schema cho notification.
import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const notificationIdParamSchema = z.object({
  id: z.string().cuid("Invalid notification id"),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
