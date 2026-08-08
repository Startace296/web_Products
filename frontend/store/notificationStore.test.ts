import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "./notificationStore";
import type { AppNotification } from "@/services/notificationApi";

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: "n1",
    type: "NEW_COMMENT",
    message: "Ai đó đã bình luận sản phẩm của bạn",
    isRead: false,
    recipientId: "u1",
    reviewId: "r1",
    commentId: "c1",
    createdAt: "2026-01-01T00:00:00.000Z",
    actor: { id: "u2", name: "Bob", avatarUrl: null },
    ...overrides,
  };
}

beforeEach(() => {
  useNotificationStore.setState({ notifications: [], unreadCount: 0 });
});

describe("useNotificationStore", () => {
  it("setInitial replaces the list and the unread count", () => {
    const items = [makeNotification({ id: "n1" }), makeNotification({ id: "n2" })];
    useNotificationStore.getState().setInitial(items, 2);
    expect(useNotificationStore.getState()).toMatchObject({ notifications: items, unreadCount: 2 });
  });

  it("addNotification prepends the new item and increments the unread count", () => {
    useNotificationStore.getState().setInitial([makeNotification({ id: "old" })], 1);
    useNotificationStore.getState().addNotification(makeNotification({ id: "new" }));

    const state = useNotificationStore.getState();
    expect(state.notifications.map((n) => n.id)).toEqual(["new", "old"]);
    expect(state.unreadCount).toBe(2);
  });

  it("markAsRead marks the target read and decrements the unread count", () => {
    useNotificationStore.getState().setInitial([makeNotification({ id: "n1", isRead: false })], 1);
    useNotificationStore.getState().markAsRead("n1");

    const state = useNotificationStore.getState();
    expect(state.notifications[0]).toMatchObject({ id: "n1", isRead: true });
    expect(state.unreadCount).toBe(0);
  });

  it("markAsRead is a no-op (does not double-decrement) when the target is already read", () => {
    useNotificationStore.getState().setInitial([makeNotification({ id: "n1", isRead: true })], 0);
    useNotificationStore.getState().markAsRead("n1");

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("markAsRead never lets the unread count go negative", () => {
    useNotificationStore.getState().setInitial([makeNotification({ id: "n1", isRead: false })], 0);
    useNotificationStore.getState().markAsRead("n1");

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("markAllAsRead marks every item read and zeroes the unread count", () => {
    useNotificationStore.getState().setInitial(
      [makeNotification({ id: "n1", isRead: false }), makeNotification({ id: "n2", isRead: false })],
      2,
    );
    useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.isRead)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it("clear empties the list and resets the unread count", () => {
    useNotificationStore.getState().setInitial([makeNotification()], 1);
    useNotificationStore.getState().clear();

    expect(useNotificationStore.getState()).toMatchObject({ notifications: [], unreadCount: 0 });
  });
});
