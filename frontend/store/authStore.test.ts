import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore, type AuthUser } from "./authStore";

const user: AuthUser = {
  id: "u1",
  email: "alice@test.local",
  name: "Alice",
  avatarUrl: null,
  bio: null,
  role: "USER",
  isVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAuthStore", () => {
  it("starts with no token and no user", () => {
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, user: null });
  });

  it("setAuth sets both the token and the user", () => {
    useAuthStore.getState().setAuth("token-1", user);
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "token-1", user });
  });

  it("setAccessToken updates only the token", () => {
    useAuthStore.getState().setAuth("token-1", user);
    useAuthStore.getState().setAccessToken("token-2");
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "token-2", user });
  });

  it("setUser updates only the user", () => {
    useAuthStore.getState().setAuth("token-1", user);
    const updatedUser = { ...user, name: "Alice Nguyen" };
    useAuthStore.getState().setUser(updatedUser);
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "token-1", user: updatedUser });
  });

  it("clearAuth resets both the token and the user", () => {
    useAuthStore.getState().setAuth("token-1", user);
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, user: null });
  });
});
