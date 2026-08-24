import { describe, it, expect } from "vitest";
import { JWTService } from "@/lib/jwt";
import { Role } from "@prisma/client";

describe("JWTService", () => {
  const userPayload = {
    userId: "user_123",
    email: "test@example.com",
    role: Role.USER,
    sessionId: "sess_123",
  };

  it("should generate and verify an access token", () => {
    const token = JWTService.generateAccessToken(userPayload);
    expect(token).toBeDefined();

    const decoded = JWTService.verifyAccessToken(token);
    expect(decoded.userId).toBe(userPayload.userId);
    expect(decoded.email).toBe(userPayload.email);
    expect(decoded.role).toBe(userPayload.role);
    expect(decoded.sessionId).toBe(userPayload.sessionId);
  });

  it("should generate and verify a refresh token", () => {
    const refreshTokenPayload = {
      userId: "user_123",
      sessionId: "sess_123",
      tokenVersion: 1,
    };

    const refreshToken = JWTService.generateRefreshToken(refreshTokenPayload);
    expect(refreshToken).toBeDefined();

    const decoded = JWTService.verifyRefreshToken(refreshToken);
    expect(decoded.userId).toBe(refreshTokenPayload.userId);
    expect(decoded.sessionId).toBe(refreshTokenPayload.sessionId);
    expect(decoded.tokenVersion).toBe(refreshTokenPayload.tokenVersion);
  });

  it("should throw error for invalid token verification", () => {
    expect(() => JWTService.verifyAccessToken("invalid_token")).toThrow();
    expect(() => JWTService.verifyRefreshToken("invalid_token")).toThrow();
  });
});
