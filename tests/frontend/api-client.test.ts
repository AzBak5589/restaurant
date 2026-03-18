import { describe, expect, it } from "vitest";
import {
  parseRefreshTokens,
  shouldTryRefresh,
} from "../../frontend/src/lib/api";

describe("frontend api auth helpers", () => {
  it("parses valid refresh response tokens", () => {
    expect(
      parseRefreshTokens({
        accessToken: "access-1",
        refreshToken: "refresh-1",
      }),
    ).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("returns null for invalid refresh response payload", () => {
    expect(parseRefreshTokens({ accessToken: "only-access" })).toBeNull();
    expect(parseRefreshTokens(null)).toBeNull();
  });

  it("attempts refresh only on first 401 with request context", () => {
    expect(shouldTryRefresh(401, true, false)).toBe(true);
    expect(shouldTryRefresh(401, true, true)).toBe(false);
    expect(shouldTryRefresh(500, true, false)).toBe(false);
    expect(shouldTryRefresh(401, false, false)).toBe(false);
  });
});
