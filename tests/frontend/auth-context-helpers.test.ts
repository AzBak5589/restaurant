import { describe, expect, it } from "vitest";
import {
  buildLoginBody,
  hasSessionToken,
} from "../../frontend/src/lib/auth-context";

describe("frontend auth context helpers", () => {
  it("builds login payload without restaurant id", () => {
    expect(buildLoginBody("admin@test.com", "secret")).toEqual({
      email: "admin@test.com",
      password: "secret",
    });
  });

  it("builds login payload with restaurant id", () => {
    expect(buildLoginBody("admin@test.com", "secret", "resto-1")).toEqual({
      email: "admin@test.com",
      password: "secret",
      restaurantId: "resto-1",
    });
  });

  it("detects session token presence", () => {
    expect(hasSessionToken(undefined)).toBe(false);
    expect(hasSessionToken("")).toBe(false);
    expect(hasSessionToken("access-token")).toBe(true);
  });
});
