import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createServer } from "@/app";
import prisma from "@/lib/prisma";
import { JWTService } from "@/lib/jwt";
import { Role } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  default: {
    $connect: vi.fn().mockResolvedValue(true),
    $transaction: vi.fn((cb) =>
      cb({
        user: { update: vi.fn().mockResolvedValue({ id: "usr_100", currentBalance: 2500, totalInvestment: 2000, totalReturns: 500 }) },
        transaction: { create: vi.fn().mockResolvedValue({ id: "tx_dep_1", amount: 1500, type: "DEPOSIT", status: "COMPLETED" }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    ),
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    portfolio: {
      findMany: vi.fn(),
    },
    investment: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    withdrawal: {
      findMany: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
}));

describe("HTTP API End-to-End Integration Tests", () => {
  const app = createServer();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health & /api/ping", () => {
    it("should return health status ok", async () => {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });

    it("should return ping response", async () => {
      const response = await request(app).get("/api/ping");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("ping");
    });
  });

  describe("POST /api/auth/register", () => {
    it("should validate input schema and reject invalid requests", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "not-an-email" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });
  });

  describe("GET /api/dashboard/overview", () => {
    it("should reject unauthenticated request with 401", async () => {
      const response = await request(app).get("/api/dashboard/overview");
      expect(response.status).toBe(401);
    });

    it("should allow authenticated request with valid JWT token", async () => {
      const userPayload = {
        userId: "usr_100",
        email: "user@test.com",
        role: Role.USER,
        sessionId: "sess_100",
      };
      const token = JWTService.generateAccessToken(userPayload);

      (prisma.session.findUnique as any).mockResolvedValue({
        id: "sess_100",
        user: {
          id: "usr_100",
          email: "user@test.com",
          role: Role.USER,
          status: "ACTIVE",
        },
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "usr_100",
        role: Role.USER,
        status: "ACTIVE",
        deletedAt: null,
        currentBalance: 1000,
        totalInvestment: 2000,
        totalReturns: 500,
      });

      (prisma.portfolio.findMany as any).mockResolvedValue([]);
      (prisma.investment.findMany as any).mockResolvedValue([]);
      (prisma.investment.groupBy as any).mockResolvedValue([]);
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.withdrawal.findMany as any).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/dashboard/overview")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/dashboard/deposit", () => {
    it("should reject unauthenticated deposit request with 401", async () => {
      const response = await request(app)
        .post("/api/dashboard/deposit")
        .send({ amount: 1000 });

      expect(response.status).toBe(401);
    });

    it("should process authenticated deposit request successfully", async () => {
      const userPayload = {
        userId: "usr_100",
        email: "user@test.com",
        role: Role.USER,
        sessionId: "sess_100",
      };
      const token = JWTService.generateAccessToken(userPayload);

      (prisma.session.findUnique as any).mockResolvedValue({
        id: "sess_100",
        user: {
          id: "usr_100",
          email: "user@test.com",
          role: Role.USER,
          status: "ACTIVE",
        },
      });

      const response = await request(app)
        .post("/api/dashboard/deposit")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 1500, paymentMethod: "BANK_TRANSFER" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Deposit successful");
    });
  });

  describe("GET /api/admin/stats", () => {
    it("should reject non-admin users with 403 Forbidden", async () => {
      const userPayload = {
        userId: "usr_100",
        email: "user@test.com",
        role: Role.USER,
        sessionId: "sess_100",
      };
      const token = JWTService.generateAccessToken(userPayload);

      (prisma.session.findUnique as any).mockResolvedValue({
        id: "sess_100",
        user: {
          id: "usr_100",
          email: "user@test.com",
          role: Role.USER,
          status: "ACTIVE",
        },
      });

      const response = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("should allow admin users to access admin stats", async () => {
      const adminPayload = {
        userId: "admin_1",
        email: "admin@test.com",
        role: Role.ADMIN,
        sessionId: "sess_admin_1",
      };
      const token = JWTService.generateAccessToken(adminPayload);

      (prisma.session.findUnique as any).mockResolvedValue({
        id: "sess_admin_1",
        user: {
          id: "admin_1",
          email: "admin@test.com",
          role: Role.ADMIN,
          status: "ACTIVE",
        },
      });

      (prisma.user.count as any).mockResolvedValue(5);
      (prisma.user.aggregate as any).mockResolvedValue({ _sum: { currentBalance: 10000, totalInvestment: 8000 } });
      (prisma.investment.count as any).mockResolvedValue(10);
      (prisma.transaction.count as any).mockResolvedValue(20);
      (prisma.user.findMany as any).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
