import { Request, Response } from "express";
import prisma from "@/lib/prisma";
import { AuthenticatedRequest } from "@/middleware/auth";
import { UserStatus, KycStatus } from "@prisma/client";
import { PasswordService } from "@/lib/password";

interface GetUsersQuery {
  search?: string;
  status?: UserStatus;
  kycStatus?: KycStatus;
  page?: string;
  limit?: string;
  sortBy?: "createdAt" | "firstName" | "lastName" | "email";
  sortOrder?: "asc" | "desc";
}

export class AdminController {
  // Get all users (admin only)
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        status,
        kycStatus,
        page = "1",
        limit = "10",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query as GetUsersQuery;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const skip = (pageNum - 1) * limitNum;

      const whereConditions: any = {
        deletedAt: null,
      };

      if (search) {
        whereConditions.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ];
      }

      if (status) {
        whereConditions.status = status;
      }

      if (kycStatus) {
        whereConditions.kycStatus = kycStatus;
      }

      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: whereConditions,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            country: true,
            role: true,
            status: true,
            kycStatus: true,
            emailVerified: true,
            totalInvestment: true,
            currentBalance: true,
            totalReturns: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
          },
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.user.count({
          where: whereConditions,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      const formattedUsers = users.map((u) => ({
        ...u,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || u.email,
        totalInvestment: Number(u.totalInvestment),
        currentBalance: Number(u.currentBalance),
        totalReturns: Number(u.totalReturns),
      }));

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        code: "USER_FETCH_ERROR",
      });
    }
  }

  // Get single user by ID (admin only)
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;

      if (!userId || typeof userId !== "string") {
        res.status(400).json({
          success: false,
          message: "Invalid user ID format",
          code: "INVALID_USER_ID",
        });
        return;
      }

      const userWithDetails = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          country: true,
          role: true,
          status: true,
          kycStatus: true,
          emailVerified: true,
          totalInvestment: true,
          currentBalance: true,
          totalReturns: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          investments: {
            select: {
              id: true,
              name: true,
              amount: true,
              currentValue: true,
              returns: true,
              returnPercent: true,
              expectedReturn: true,
              status: true,
              packageId: true,
              createdAt: true,
              startDate: true,
              endDate: true,
              package: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  minInvestment: true,
                  maxInvestment: true,
                  expectedReturn: true,
                  duration: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          transactions: {
            select: {
              id: true,
              type: true,
              amount: true,
              status: true,
              description: true,
              reference: true,
              createdAt: true,
              executedAt: true,
              investmentId: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          withdrawals: {
            select: {
              id: true,
              amount: true,
              fee: true,
              netAmount: true,
              method: true,
              bankAccount: true,
              cryptoAddress: true,
              status: true,
              reference: true,
              notes: true,
              reason: true,
              createdAt: true,
              processedAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          _count: {
            select: {
              investments: true,
              transactions: true,
              withdrawals: true,
            },
          },
        },
      });

      if (!userWithDetails) {
        res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      const totalInvestmentAmount = userWithDetails.investments.reduce(
        (sum, inv) => sum + Number(inv.amount),
        0,
      );

      const totalCurrentValue = userWithDetails.investments.reduce(
        (sum, inv) => sum + Number(inv.currentValue || inv.amount),
        0,
      );

      const activeInvestmentsCount = userWithDetails.investments.filter(
        (inv) => inv.status === "ACTIVE",
      ).length;

      res.json({
        success: true,
        data: {
          user: {
            ...userWithDetails,
            name: `${userWithDetails.firstName || ""} ${userWithDetails.lastName || ""}`.trim() || userWithDetails.username || userWithDetails.email,
            totalInvestment: Number(userWithDetails.totalInvestment),
            currentBalance: Number(userWithDetails.currentBalance),
            totalReturns: Number(userWithDetails.totalReturns),
          },
          investments: userWithDetails.investments.map((i) => ({
            ...i,
            amount: Number(i.amount),
            currentValue: Number(i.currentValue),
            returns: Number(i.returns),
            returnPercent: Number(i.returnPercent),
          })),
          transactions: userWithDetails.transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
          })),
          withdrawals: userWithDetails.withdrawals.map((w) => ({
            ...w,
            amount: Number(w.amount),
            fee: Number(w.fee),
            netAmount: Number(w.netAmount),
          })),
          summary: {
            totalInvestments: userWithDetails._count.investments,
            totalTransactions: userWithDetails._count.transactions,
            totalWithdrawals: userWithDetails._count.withdrawals,
            totalInvestmentAmount,
            totalCurrentValue,
            totalReturn: totalCurrentValue - totalInvestmentAmount,
            activeInvestments: activeInvestmentsCount,
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user details",
        code: "USER_FETCH_ERROR",
      });
    }
  }

  // Update user profile (admin only)
  static async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const updateData = req.body;

      if (!userId) {
        res.status(400).json({
          error: "User ID is required",
          code: "MISSING_USER_ID",
        });
        return;
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: "Update data is required",
          code: "EMPTY_UPDATE_DATA",
        });
        return;
      }

      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "username",
        "phone",
        "country",
        "currentBalance",
        "totalInvestment",
        "totalReturns",
        "kycStatus",
        "status",
        "role",
      ];

      const filteredData: Record<string, any> = {};
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          filteredData[field] = updateData[field];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        res.status(400).json({
          success: false,
          error: "No valid fields to update",
          code: "NO_VALID_FIELDS",
        });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser || existingUser.deletedAt) {
        res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      if (filteredData.email && filteredData.email !== existingUser.email) {
        const emailExists = await prisma.user.findFirst({
          where: {
            email: filteredData.email.toLowerCase(),
            id: { not: userId },
          },
        });

        if (emailExists) {
          res.status(409).json({
            error: "Email already exists",
            code: "EMAIL_CONFLICT",
          });
          return;
        }
        filteredData.email = filteredData.email.toLowerCase();
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: filteredData,
      });

      res.status(200).json({
        success: true,
        message: "User profile updated successfully",
        data: {
          user: {
            ...updatedUser,
            totalInvestment: Number(updatedUser.totalInvestment),
            currentBalance: Number(updatedUser.currentBalance),
            totalReturns: Number(updatedUser.totalReturns),
          },
          updatedFields: Object.keys(filteredData),
        },
      });
    } catch (error: any) {
      console.error("Database error updating profile:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: "Failed to update user profile",
      });
    }
  }

  // Update user investments (admin only)
  static async updateUserInvestments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { investments } = req.body;

      if (!Array.isArray(investments)) {
        res.status(400).json({ error: "Investments array is required" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const updatedInvestments = [];
      for (const inv of investments) {
        if (inv.id) {
          const updated = await prisma.investment.update({
            where: { id: inv.id },
            data: {
              name: inv.name,
              amount: inv.amount,
              currentValue: inv.currentValue,
              returns: inv.returns,
              returnPercent: inv.returnPercent,
              status: inv.status,
            },
          });
          updatedInvestments.push(updated);
        } else {
          const created = await prisma.investment.create({
            data: {
              userId,
              name: inv.name || "Custom Investment",
              amount: inv.amount || 0,
              currentValue: inv.currentValue || inv.amount || 0,
              returns: inv.returns || 0,
              returnPercent: inv.returnPercent || 0,
              duration: inv.duration || 30,
              startDate: inv.startDate ? new Date(inv.startDate) : new Date(),
              endDate: inv.endDate ? new Date(inv.endDate) : new Date(Date.now() + 30 * 86400000),
              status: inv.status || "ACTIVE",
            },
          });
          updatedInvestments.push(created);
        }
      }

      res.json({
        success: true,
        message: "User investments updated successfully",
        data: { investments: updatedInvestments },
      });
    } catch (error) {
      console.error("Failed to update user investments:", error);
      res.status(500).json({ error: "Failed to update user investments" });
    }
  }

  // Update user transactions (admin only)
  static async updateUserTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { transactions } = req.body;

      if (!Array.isArray(transactions)) {
        res.status(400).json({ error: "Transactions array is required" });
        return;
      }

      const updatedTransactions = [];
      for (const tx of transactions) {
        if (tx.id) {
          const updated = await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              amount: tx.amount,
              status: tx.status,
              type: tx.type,
              description: tx.description,
            },
          });
          updatedTransactions.push(updated);
        } else {
          const created = await prisma.transaction.create({
            data: {
              userId,
              type: tx.type || "DEPOSIT",
              amount: tx.amount || 0,
              status: tx.status || "COMPLETED",
              description: tx.description || "Admin recorded transaction",
              reference: tx.reference || `TX${Date.now()}`,
              executedAt: new Date(),
            },
          });
          updatedTransactions.push(created);
        }
      }

      res.json({
        success: true,
        message: "User transactions updated successfully",
        data: { transactions: updatedTransactions },
      });
    } catch (error) {
      console.error("Failed to update user transactions:", error);
      res.status(500).json({ error: "Failed to update user transactions" });
    }
  }

  // Update user packages (admin only)
  static async updateUserPackages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { packages } = req.body;

      if (!Array.isArray(packages)) {
        res.status(400).json({ error: "Packages array is required" });
        return;
      }

      const updatedUserPackages = [];
      for (const pkg of packages) {
        if (pkg.packageId) {
          const upserted = await prisma.userPackage.upsert({
            where: {
              userId_packageId: { userId, packageId: pkg.packageId },
            },
            update: {
              isActive: pkg.isActive ?? true,
              expiresAt: pkg.expiresAt ? new Date(pkg.expiresAt) : null,
            },
            create: {
              userId,
              packageId: pkg.packageId,
              isActive: pkg.isActive ?? true,
              expiresAt: pkg.expiresAt ? new Date(pkg.expiresAt) : null,
            },
          });
          updatedUserPackages.push(upserted);
        }
      }

      res.json({
        success: true,
        message: "User packages updated successfully",
        data: { packages: updatedUserPackages },
      });
    } catch (error) {
      console.error("Failed to update user packages:", error);
      res.status(500).json({ error: "Failed to update user packages" });
    }
  }

  // Update user withdrawals (admin only)
  static async updateUserWithdrawals(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { withdrawals } = req.body;

      if (!Array.isArray(withdrawals)) {
        res.status(400).json({ error: "Withdrawals array is required" });
        return;
      }

      const updatedWithdrawals = [];
      for (const w of withdrawals) {
        if (w.id) {
          const updated = await prisma.withdrawal.update({
            where: { id: w.id },
            data: {
              status: w.status,
              notes: w.adminNotes || w.notes,
              reason: w.reason,
              processedAt: w.status === "COMPLETED" || w.status === "APPROVED" ? new Date() : undefined,
            },
          });
          updatedWithdrawals.push(updated);
        }
      }

      res.json({
        success: true,
        message: "User withdrawals updated successfully",
        data: { withdrawals: updatedWithdrawals },
      });
    } catch (error) {
      console.error("Failed to update user withdrawals:", error);
      res.status(500).json({ error: "Failed to update user withdrawals" });
    }
  }

  // Create new user (admin only)
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body;

      if (!userData.email || !userData.password) {
        res.status(400).json({
          error: "Email and password are required",
        });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        res.status(400).json({ error: "Email already exists" });
        return;
      }

      const hashedPassword = await PasswordService.hashPassword(userData.password);

      const newUser = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          firstName: userData.firstName || userData.name?.split(" ")[0] || "",
          lastName: userData.lastName || userData.name?.split(" ").slice(1).join(" ") || "",
          password: hashedPassword,
          phone: userData.phone || null,
          country: userData.country || null,
          currentBalance: userData.accountBalance || userData.currentBalance || 0,
          totalInvestment: userData.totalDeposit || userData.totalInvestment || 0,
          role: userData.role || "USER",
          status: userData.status || "ACTIVE",
          kycStatus: userData.kycStatus || "PENDING",
        },
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          ...newUser,
          totalInvestment: Number(newUser.totalInvestment),
          currentBalance: Number(newUser.currentBalance),
          totalReturns: Number(newUser.totalReturns),
        },
      });
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  }

  // Delete user (admin soft delete)
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), status: "INACTIVE" },
      });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }

  // Get admin dashboard stats
  static async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalUsers,
        activeUsers,
        pendingKyc,
        aggregateBalances,
        totalInvestments,
        totalTransactions,
        recentUsers,
      ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
        prisma.user.count({ where: { kycStatus: "PENDING", deletedAt: null } }),
        prisma.user.aggregate({
          where: { deletedAt: null },
          _sum: {
            currentBalance: true,
            totalInvestment: true,
          },
        }),
        prisma.investment.count(),
        prisma.transaction.count(),
        prisma.user.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            kycStatus: true,
            createdAt: true,
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          pendingKyc,
          totalBalance: Number(aggregateBalances._sum.currentBalance || 0),
          totalDeposits: Number(aggregateBalances._sum.totalInvestment || 0),
          totalInvestments,
          totalTransactions,
          recentUsers: recentUsers.map((u) => ({
            ...u,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
          })),
        },
      });
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  }

  // Impersonate user (admin only)
  static async impersonateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId as string;

      const user = (await prisma.user.findUnique({
        where: { id: userId },
        include: {
          investments: { take: 10 },
          transactions: { take: 10 },
        },
      })) as any;

      if (!user || user.deletedAt) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        success: true,
        message: "Impersonation successful",
        userSession: {
          id: user.id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
          email: user.email,
          role: user.role,
        },
        dashboardData: {
          profile: {
            ...user,
            totalInvestment: Number(user.totalInvestment),
            currentBalance: Number(user.currentBalance),
            totalReturns: Number(user.totalReturns),
          },
          investments: user.investments.map((inv) => ({
            ...inv,
            amount: Number(inv.amount),
            currentValue: Number(inv.currentValue),
          })),
          transactions: user.transactions.map((tx) => ({
            ...tx,
            amount: Number(tx.amount),
          })),
        },
      });
    } catch (error) {
      console.error("Failed to impersonate user:", error);
      res.status(500).json({ error: "Failed to impersonate user" });
    }
  }
}

export default AdminController;
