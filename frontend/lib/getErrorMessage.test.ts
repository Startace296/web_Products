import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { getErrorMessage } from "./getErrorMessage";

function makeAxiosError(data?: unknown): AxiosError {
  const error = new AxiosError("Request failed");
  if (data !== undefined) {
    error.response = { data } as AxiosError["response"];
  }
  return error;
}

describe("getErrorMessage", () => {
  it("returns the backend message from an AxiosError response body", () => {
    const error = makeAxiosError({ success: false, message: "Email đã tồn tại" });
    expect(getErrorMessage(error)).toBe("Email đã tồn tại");
  });

  it("falls back to the default message when the response has no message field", () => {
    const error = makeAxiosError({ success: false });
    expect(getErrorMessage(error)).toBe("Đã có lỗi xảy ra, vui lòng thử lại.");
  });

  it("falls back to the default message when the AxiosError has no response at all", () => {
    const error = makeAxiosError();
    expect(getErrorMessage(error)).toBe("Đã có lỗi xảy ra, vui lòng thử lại.");
  });

  it("uses a custom fallback when provided", () => {
    const error = makeAxiosError();
    expect(getErrorMessage(error, "Không thể tải dữ liệu.")).toBe("Không thể tải dữ liệu.");
  });

  it("falls back to the default message for non-Axios errors", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("Đã có lỗi xảy ra, vui lòng thử lại.");
    expect(getErrorMessage("boom")).toBe("Đã có lỗi xảy ra, vui lòng thử lại.");
    expect(getErrorMessage(null)).toBe("Đã có lỗi xảy ra, vui lòng thử lại.");
  });
});
