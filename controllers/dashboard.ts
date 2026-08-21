import { Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

// Validation schemas
const createPortfolioSchema = z.object({
  name: z.string().min(1, "Portfolio name is required"),
  description: z.string().optional(),
});

const createInvestmentSchema = z.object({
  packageId: z.string().optional(),
  name: z.string().min(1, "Investment name is required"),
  description: z.string().optional(),
  amount: z.number().positive("Investment amount must be positive"),
  duration: z.number().positive("Duration must be positive"),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "AGGRESSIVE"]).optional(),
});

const createWithdrawalSchema = z.object({
  amount: z.number().positive("Withdrawal amount must be positive"),
  method: z.enum(["BANK_TRANSFER", "CRYPTO", "PAYPAL", "CHECK"]),
  bankAccount: z.string().optional(),
  cryptoAddress: z.string().optional(),
  notes: z.string().optional(),
});

export class DashboardController {
  // Get user dashboard overview
  static async getDashboardOverview(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const userId = req.user.id;

      // Get user profile with investment summary
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          totalInvestment: true,
          currentBalance: true,
          totalReturns: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      // Get portfolio summary
      const portfolios = await prisma.portfolio.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          totalValue: true,
          totalInvested: true,
          totalReturns: true,
          performance: true,
          isDefault: true,
          _count: {
            select: { holdings: true },
          },
        },
      });

      // Get recent transactions
      const recentTransactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          symbol: true,
          amount: true,
          status: true,
          createdAt: true,
          executedAt: true,
        },
      });

      // Get active investments
      const activeInvestments = await prisma.investment.findMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          amount: true,
          currentValue: true,
          returns: true,
          returnPercent: true,
          startDate: true,
          endDate: true,
          riskLevel: true,
        },
      });

      // Get pending withdrawals
      const pendingWithdrawals = await prisma.withdrawal.findMany({
        where: {
          userId,
          status: "PENDING",
        },
        select: {
          id: true,
          amount: true,
          method: true,
          createdAt: true,
        },
      });

      // Calculate performance metrics
      const totalInvestment = Number(user.totalInvestment);
      const currentBalance = Number(user.currentBalance);
      const totalReturns = Number(user.totalReturns);
      const performancePercent =
        totalInvestment > 0 ? (totalReturns / totalInvestment) * 100 : 0;

      // Get monthly performance data (last 12 months)
      const monthlyPerformance = await getMonthlyPerformance(userId);

      // Get investment distribution by risk level
      const riskDistribution = await getRiskDistribution(userId);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            joinedAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
          summary: {
            totalInvestment,
            currentBalance,
            totalReturns,
            performancePercent: Number(performancePercent.toFixed(2)),
            portfolioCount: portfolios.length,
            activeInvestments: activeInvestments.length,
            pendingWithdrawals: pendingWithdrawals.length,
          },
          portfolios: portfolios.map((p) => ({
            ...p,
            totalValue: Number(p.totalValue),
            totalInvested: Number(p.totalInvested),
            totalReturns: Number(p.totalReturns),
            performance: Number(p.performance),
            holdingsCount: p._count.holdings,
          })),
          recentTransactions: recentTransactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
          })),
          activeInvestments: activeInvestments.map((i) => ({
            ...i,
            amount: Number(i.amount),
            currentValue: Number(i.currentValue),
            returns: Number(i.returns),
            returnPercent: Number(i.returnPercent),
          })),
          pendingWithdrawals: pendingWithdrawals.map((w) => ({
            ...w,
            amount: Number(w.amount),
          })),
          charts: {
            monthlyPerformance,
            riskDistribution,
          },
        },
      });
    } catch (error) {
      console.error("Dashboard overview error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard overview",
        code: "DASHBOARD_ERROR",
      });
    }
  }

  // Get user portfolios
  static async getPortfolios(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const portfolios = await prisma.portfolio.findMany({
        where: { userId: req.user.id },
        include: {
          holdings: {
            select: {
              id: true,
              symbol: true,
              name: true,
              quantity: true,
              avgPrice: true,
              currentPrice: true,
              totalValue: true,
              pnl: true,
              pnlPercent: true,
              assetType: true,
            },
          },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });

      res.json({
        success: true,
        data: {
          portfolios: portfolios.map((p) => ({
            ...p,
            totalValue: Number(p.totalValue),
            totalInvested: Number(p.totalInvested),
            totalReturns: Number(p.totalReturns),
            performance: Number(p.performance),
            holdings: p.holdings.map((h) => ({
              ...h,
              quantity: Number(h.quantity),
              avgPrice: Number(h.avgPrice),
              currentPrice: Number(h.currentPrice),
              totalValue: Number(h.totalValue),
              pnl: Number(h.pnl),
              pnlPercent: Number(h.pnlPercent),
            })),
          })),
        },
      });
    } catch (error) {
      console.error("Get portfolios error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get portfolios",
        code: "PORTFOLIOS_ERROR",
      });
    }
  }

  // Create new portfolio
  static async createPortfolio(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const validatedData = createPortfolioSchema.parse(req.body);

      // Check if this is the first portfolio (make it default)
      const existingPortfolios = await prisma.portfolio.count({
        where: { userId: req.user.id },
      });

      const portfolio = await prisma.portfolio.create({
        data: {
          userId: req.user.id,
          name: validatedData.name,
          description: validatedData.description,
          isDefault: existingPortfolios === 0,
        },
      });

      res.status(201).json({
        success: true,
        message: "Portfolio created successfully",
        data: { portfolio },
      });
    } catch (error) {
      console.error("Create portfolio error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Failed to create portfolio",
        code: "CREATE_PORTFOLIO_ERROR",
      });
    }
  }

  // Get user investments
  static async getInvestments(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const { status, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = { userId: req.user.id };
      if (status) {
        where.status = status;
      }

      const [investments, total] = await Promise.all([
        prisma.investment.findMany({
          where,
          include: {
            package: {
              select: {
                name: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: Number(limit),
        }),
        prisma.investment.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          investments: investments.map((i) => ({
            ...i,
            amount: Number(i.amount),
            currentValue: Number(i.currentValue),
            returns: Number(i.returns),
            returnPercent: Number(i.returnPercent),
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get investments error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get investments",
        code: "INVESTMENTS_ERROR",
      });
    }
  }

  // Create new investment
  static async createInvestment(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const validatedData = createInvestmentSchema.parse(req.body);

      // Check user balance
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { currentBalance: true },
      });

      if (!user || Number(user.currentBalance) < validatedData.amount) {
        res.status(400).json({
          success: false,
          message: "Insufficient balance",
          code: "INSUFFICIENT_BALANCE",
        });
        return;
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() + validatedData.duration * 24 * 60 * 60 * 1000,
      );

      const investment = await prisma.$transaction(async (tx) => {
        // Create investment
        const newInvestment = await tx.investment.create({
          data: {
            userId: req.user!.id,
            packageId: validatedData.packageId,
            name: validatedData.name,
            description: validatedData.description,
            amount: validatedData.amount,
            currentValue: validatedData.amount,
            duration: validatedData.duration,
            startDate,
            endDate,
            riskLevel: validatedData.riskLevel || "MODERATE",
          },
        });

        // Update user balance
        await tx.user.update({
          where: { id: req.user!.id },
          data: {
            currentBalance: {
              decrement: validatedData.amount,
            },
            totalInvestment: {
              increment: validatedData.amount,
            },
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: req.user!.id,
            type: "TRANSFER_OUT",
            amount: validatedData.amount,
            description: `Investment in ${validatedData.name}`,
            status: "COMPLETED",
            executedAt: new Date(),
          },
        });

        return newInvestment;
      });

      res.status(201).json({
        success: true,
        message: "Investment created successfully",
        data: { investment },
      });
    } catch (error) {
      console.error("Create investment error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Failed to create investment",
        code: "CREATE_INVESTMENT_ERROR",
      });
    }
  }

  // Get user transactions
  static async getTransactions(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const { type, status, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = { userId: req.user.id };
      if (type) where.type = type;
      if (status) where.status = status;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: Number(limit),
        }),
        prisma.transaction.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          transactions: transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
            fee: Number(t.fee),
            quantity: t.quantity ? Number(t.quantity) : null,
            price: t.price ? Number(t.price) : null,
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transactions",
        code: "TRANSACTIONS_ERROR",
      });
    }
  }

  // Create withdrawal request
  static async createWithdrawal(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const validatedData = createWithdrawalSchema.parse(req.body);

      // Check user balance
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { currentBalance: true },
      });

      if (!user || Number(user.currentBalance) < validatedData.amount) {
        res.status(400).json({
          success: false,
          message: "Insufficient balance",
          code: "INSUFFICIENT_BALANCE",
        });
        return;
      }

      // Calculate fee (example: 2% fee)
      const feePercent = 0.02;
      const fee = validatedData.amount * feePercent;
      const netAmount = validatedData.amount - fee;

      const withdrawal = await prisma.withdrawal.create({
        data: {
          userId: req.user.id,
          amount: validatedData.amount,
          fee,
          netAmount,
          method: validatedData.method,
          bankAccount: validatedData.bankAccount,
          cryptoAddress: validatedData.cryptoAddress,
          notes: validatedData.notes,
          reference: `WD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        },
      });

      res.status(201).json({
        success: true,
        message: "Withdrawal request created successfully",
        data: { withdrawal },
      });
    } catch (error) {
      console.error("Create withdrawal error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Failed to create withdrawal",
        code: "CREATE_WITHDRAWAL_ERROR",
      });
    }
  }
}

// Helper functions
async function getMonthlyPerformance(userId: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - 12);

  // This is a simplified version - in production, you'd calculate actual monthly returns
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);

    // Simulate performance data - replace with actual calculation
    const performance = Math.random() * 20 - 5; // Random between -5% and 15%

    monthlyData.push({
      month: date.toISOString().substring(0, 7), // YYYY-MM format
      performance: Number(performance.toFixed(2)),
    });
  }

  return monthlyData;
}

async function getRiskDistribution(userId: string) {
  const distribution = await prisma.investment.groupBy({
    by: ["riskLevel"],
    where: {
      userId,
      status: "ACTIVE",
    },
    _sum: {
      amount: true,
    },
  });

  return distribution.map((d) => ({
    riskLevel: d.riskLevel,
    amount: Number(d._sum.amount || 0),
  }));
}

export default DashboardController;
