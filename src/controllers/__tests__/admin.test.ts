import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminController } from "@/controllers/admin";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    investment: {
      count: vi.fn(),
    },
    transaction: {
      count: vi.fn(),
    },
  },
}));

describe("AdminController", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should fetch paginated users list for admin", async () => {
      (prisma.user.findMany as any).mockResolvedValue([
        { id: "usr_1", email: "u1@test.com", totalInvestment: 100, currentBalance: 100, totalReturns: 0 },
      ]);
      (prisma.user.count as any).mockResolvedValue(1);

      await AdminController.getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            pagination: expect.objectContaining({ total: 1 }),
          }),
        }),
      );
    });
  });

  describe("getAdminStats", () => {
    it("should aggregate stats correctly", async () => {
      (prisma.user.count as any).mockResolvedValue(10);
      (prisma.user.aggregate as any).mockResolvedValue({
        _sum: { currentBalance: 50000, totalInvestment: 40000 },
      });
      (prisma.investment.count as any).mockResolvedValue(15);
      (prisma.transaction.count as any).mockResolvedValue(30);
      (prisma.user.findMany as any).mockResolvedValue([]);

      await AdminController.getAdminStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalUsers: 10,
            totalBalance: 50000,
          }),
        }),
      );
    });
  });
});
