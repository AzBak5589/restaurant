import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/middlewares/error.middleware";
import { logout, refreshTokens } from "../src/controllers/auth.controller";

const mocks = vi.hoisted(() => ({
  prismaUserFindUnique: vi.fn(),
  prismaUserUpdate: vi.fn(),
  verifyRefreshToken: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

vi.mock("../src/config/database", () => ({
  default: {
    user: {
      findUnique: mocks.prismaUserFindUnique,
      update: mocks.prismaUserUpdate,
    },
  },
}));

vi.mock("../src/utils/jwt", () => ({
  verifyRefreshToken: mocks.verifyRefreshToken,
  generateAccessToken: mocks.generateAccessToken,
  generateRefreshToken: mocks.generateRefreshToken,
}));

const createMockResponse = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

describe("auth controller - refresh/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects revoked refresh token version", async () => {
    mocks.verifyRefreshToken.mockReturnValue({
      id: "user-1",
      email: "user@test.com",
      role: "ADMIN",
      restaurantId: "resto-1",
      tokenVersion: 1,
    });
    mocks.prismaUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      firstName: "Test",
      lastName: "User",
      role: "ADMIN",
      restaurantId: "resto-1",
      isActive: true,
      refreshTokenVersion: 2,
    });

    const req = { body: { refreshToken: "old-token" } } as any;
    const res = createMockResponse() as any;

    await expect(refreshTokens(req, res)).rejects.toMatchObject<AppError>({
      message: "Refresh token revoked",
      statusCode: 401,
    });
    expect(mocks.prismaUserUpdate).not.toHaveBeenCalled();
  });

  it("rotates refresh token version on successful refresh", async () => {
    mocks.verifyRefreshToken.mockReturnValue({
      id: "user-1",
      email: "user@test.com",
      role: "ADMIN",
      restaurantId: "resto-1",
      tokenVersion: 2,
    });
    mocks.prismaUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      firstName: "Test",
      lastName: "User",
      role: "ADMIN",
      restaurantId: "resto-1",
      isActive: true,
      refreshTokenVersion: 2,
    });
    mocks.prismaUserUpdate.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      firstName: "Test",
      lastName: "User",
      role: "ADMIN",
      restaurantId: "resto-1",
      refreshTokenVersion: 3,
    });
    mocks.generateAccessToken.mockReturnValue("access-3");
    mocks.generateRefreshToken.mockReturnValue("refresh-3");

    const req = { body: { refreshToken: "valid-token" } } as any;
    const res = createMockResponse() as any;

    await refreshTokens(req, res);

    expect(mocks.prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshTokenVersion: { increment: 1 } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        restaurantId: true,
        refreshTokenVersion: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access-3",
        refreshToken: "refresh-3",
      }),
    );
  });

  it("revokes tokens on logout by incrementing version", async () => {
    mocks.prismaUserUpdate.mockResolvedValue({});
    const req = { user: { id: "user-1" } } as any;
    const res = createMockResponse() as any;

    await logout(req, res);

    expect(mocks.prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { refreshTokenVersion: { increment: 1 } },
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

