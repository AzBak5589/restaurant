import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "../../frontend/src/lib/api-error";

describe("frontend api-error utility", () => {
  it("returns fallback for non-axios errors", () => {
    expect(getApiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });

  it("prefers payload.message when available", () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: { data: { message: "Invalid credentials" } },
    };
    expect(getApiErrorMessage(axiosLikeError, "fallback")).toBe(
      "Invalid credentials",
    );
  });

  it("uses payload.error when message is absent", () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: { data: { error: "Unauthorized" } },
    };
    expect(getApiErrorMessage(axiosLikeError, "fallback")).toBe("Unauthorized");
  });

  it("joins validation details when present", () => {
    const axiosLikeError = {
      isAxiosError: true,
      response: {
        data: {
          details: [{ message: "name required" }, { message: "email invalid" }],
        },
      },
    };
    expect(getApiErrorMessage(axiosLikeError, "fallback")).toBe(
      "name required, email invalid",
    );
  });
});
