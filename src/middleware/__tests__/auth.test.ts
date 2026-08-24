import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateToken, requireAdmin, optionalAuth } from "@/middleware/auth";
import { JWTService } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  default: {
    session: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Auth Middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe("authenticateToken", () => {
    it("should return 401 if Authorization header is missing", async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Access token required",
        code: "TOKEN_MISSING",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is invalid", async () => {
      req.headers.authorization = "Bearer invalid_token";

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid access token",
        code: "TOKEN_INVALID",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should authenticate valid token and attach user to req", async () => {
      const tokenPayload = {
        userId: "usr_123",
        email: "user@test.com",
        role: Role.USER,
        sessionId: "sess_123",
      };

      const token = JWTService.generateAccessToken(tokenPayload);
      req.headers.authorization = `Bearer ${token}`;

      const mockSession = {
        id: "sess_123",
        user: {
          id: "usr_123",
          email: "user@test.com",
          role: Role.USER,
          status: "ACTIVE",
          emailVerified: true,
        },
      };

      (prisma.session.findUnique as any).mockResolvedValue(mockSession);

      await authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe("usr_123");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("should return 401 if user is not attached to request", () => {
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 if user role is USER", () => {
      req.user = { id: "usr_123", role: Role.USER };
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next if user role is ADMIN", () => {
      req.user = { id: "admin_123", role: Role.ADMIN };
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("optionalAuth", () => {
    it("should call next even if no token is provided", async () => {
      await optionalAuth(req, res, next);
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
