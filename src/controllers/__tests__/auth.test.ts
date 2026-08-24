import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthController } from "@/controllers/auth";
import prisma from "@/lib/prisma";
import { PasswordService } from "@/lib/password";
import { Role } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("AuthController", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: {},
      user: null,
      get: vi.fn().mockReturnValue("TestAgent"),
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      req.body = {
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        password: "SecureP@ssw0rd1",
        confirmPassword: "SecureP@ssw0rd1",
      };

      (prisma.user.findFirst as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: "usr_123",
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        role: Role.USER,
        status: "ACTIVE",
        totalInvestment: 0,
        currentBalance: 0,
        totalReturns: 0,
        createdAt: new Date(),
      });
      (prisma.session.create as any).mockResolvedValue({ id: "sess_123" });
      (prisma.session.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        }),
      );
    });

    it("should return 400 if validation fails", async () => {
      req.body = {
        email: "invalid-email",
        password: "short",
      };

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Validation error",
        }),
      );
    });
  });

  describe("login", () => {
    it("should login user with correct credentials", async () => {
      const password = "SecureP@ssw0rd1";
      const hashedPassword = await PasswordService.hashPassword(password);

      req.body = {
        email: "test@example.com",
        password: password,
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "usr_123",
        email: "test@example.com",
        username: "testuser",
        password: hashedPassword,
        role: Role.USER,
        status: "ACTIVE",
        deletedAt: null,
      });

      (prisma.session.create as any).mockResolvedValue({ id: "sess_123" });
      (prisma.session.update as any).mockResolvedValue({});
      (prisma.session.updateMany as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.auditLog.create as any).mockResolvedValue({});

      await AuthController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successful",
        }),
      );
    });
  });
});
