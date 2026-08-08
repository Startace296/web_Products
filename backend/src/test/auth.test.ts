// Integration test qua HTTP thật (supertest + app Express thật + MySQL test thật) cho
// luồng register -> verify OTP -> login -> me -> refresh -> logout. Chỉ mock ranh giới
// gửi email thật (utils/mailer) — mọi thứ khác (validate, rate limiter, service,
// repository, Prisma, DB) đều chạy thật, đúng tinh thần "test DB thật" đã chọn.
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../utils/mailer", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

import { sendMail } from "../utils/mailer";
import { app } from "./helpers";

const mockedSendMail = vi.mocked(sendMail);

const REGISTER_INPUT = {
  email: "alice@test.local",
  password: "Password123",
  name: "Alice Nguyen",
};

const extractOtpCode = (): string => {
  const lastCall = mockedSendMail.mock.calls.at(-1);
  const html = lastCall?.[0]?.html ?? "";
  const match = html.match(/(\d{6})/);
  if (!match) throw new Error("OTP code not found in the mocked email content");
  return match[1];
};

beforeEach(() => {
  mockedSendMail.mockClear();
});

describe("auth flow", () => {
  it("registers, verifies OTP, logs in, and reads /me with the issued access token", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send(REGISTER_INPUT);
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.email).toBe(REGISTER_INPUT.email);
    expect(mockedSendMail).toHaveBeenCalledTimes(1);
    expect(mockedSendMail.mock.calls[0][0].to).toBe(REGISTER_INPUT.email);

    // Chưa verify thì không login được — otpService.verify là bước bắt buộc.
    const loginBeforeVerify = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: REGISTER_INPUT.email, password: REGISTER_INPUT.password });
    expect(loginBeforeVerify.status).toBe(403);

    const code = extractOtpCode();
    const verifyRes = await request(app)
      .post("/api/v1/auth/verify-otp")
      .send({ email: REGISTER_INPUT.email, code });
    expect(verifyRes.status).toBe(200);

    const agent = request.agent(app);
    const loginRes = await agent
      .post("/api/v1/auth/login")
      .send({ email: REGISTER_INPUT.email, password: REGISTER_INPUT.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe(REGISTER_INPUT.email);
    expect(loginRes.body.data.accessToken).toEqual(expect.any(String));
    expect(loginRes.headers["set-cookie"]).toBeDefined();

    const accessToken = loginRes.body.data.accessToken as string;
    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(REGISTER_INPUT.email);

    // agent giữ cookie refreshToken từ login ở trên — refresh phải rotate ra token mới.
    // (Chỉ accessToken KHÔNG đảm bảo khác lần trước — access token không lưu/hash ở đâu
    // nên không có ràng buộc unique nào buộc nó phải khác, khác với refreshToken bên dưới.)
    const refreshRes = await agent.post("/api/v1/auth/refresh");
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toEqual(expect.any(String));

    const logoutRes = await agent.post("/api/v1/auth/logout");
    expect(logoutRes.status).toBe(200);

    // Refresh token vừa logout (đã revoke) không dùng lại được nữa.
    const refreshAfterLogout = await agent.post("/api/v1/auth/refresh");
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("rejects login with the wrong password without revealing whether the email exists", async () => {
    await request(app).post("/api/v1/auth/register").send(REGISTER_INPUT);
    const code = extractOtpCode();
    await request(app).post("/api/v1/auth/verify-otp").send({ email: REGISTER_INPUT.email, code });

    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: REGISTER_INPUT.email, password: "WrongPassword1" });
    expect(wrongPassword.status).toBe(401);

    const unknownEmail = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@test.local", password: "WrongPassword1" });
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it("rejects registering an email that is already verified", async () => {
    await request(app).post("/api/v1/auth/register").send(REGISTER_INPUT);
    const code = extractOtpCode();
    await request(app).post("/api/v1/auth/verify-otp").send({ email: REGISTER_INPUT.email, code });

    const secondRegister = await request(app).post("/api/v1/auth/register").send(REGISTER_INPUT);
    expect(secondRegister.status).toBe(409);
  });
});
