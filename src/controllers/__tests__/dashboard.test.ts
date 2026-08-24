import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardController } from "@/controllers/dashboard";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn((cb) =>
      cb({
        user: { update: vi.fn().mockResolvedValue({ id: "usr_123", currentBalance: 1500, totalInvestment: 0, totalReturns: 0 }) },
        transaction: { create: vi.fn().mockResolvedValue({ id: "tx_123", amount: 1500, type: "DEPOSIT", status: "COMPLETED" }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    ),
    user: {
      findUnique: vi.fn(),
    },
    portfolio: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    investment: {
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
    withdrawal: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("DashboardController", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      user: { id: "usr_123" },
      body: {},
      get: vi.fn().mockReturnValue("TestAgent"),
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("getDashboardOverview", () => {
    it("should return dashboard overview for authenticated user", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "usr_123",
        currentBalance: 5000,
        totalInvestment: 10000,
        totalReturns: 2500,
      });
      (prisma.portfolio.findMany as any).mockResolvedValue([]);
      (prisma.investment.findMany as any).mockResolvedValue([]);
      (prisma.investment.groupBy as any).mockResolvedValue([]);
      (prisma.transaction.findMany as any).mockResolvedValue([]);
      (prisma.withdrawal.findMany as any).mockResolvedValue([]);

      await DashboardController.getDashboardOverview(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            summary: expect.objectContaining({
              currentBalance: 5000,
              totalInvestment: 10000,
            }),
          }),
        }),
      );
    });
  });

  describe("createPortfolio", () => {
    it("should create a portfolio for the user", async () => {
      req.body = { name: "Growth Portfolio", description: "My growth assets" };

      (prisma.portfolio.count as any).mockResolvedValue(0);
      (prisma.portfolio.create as any).mockResolvedValue({
        id: "port_123",
        userId: "usr_123",
        name: "Growth Portfolio",
        totalValue: 0,
      });

      await DashboardController.createPortfolio(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });
  });

  describe("createDeposit", () => {
    it("should create a deposit and credit balance successfully", async () => {
      req.body = { amount: 1500, paymentMethod: "BANK_TRANSFER" };

      await DashboardController.createDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Deposit successful",
        }),
      );
    });

    it("should reject negative or zero deposit amount with 400", async () => {
      req.body = { amount: -100 };

      await DashboardController.createDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Validation error",
        }),
      );
    });
  });
});
