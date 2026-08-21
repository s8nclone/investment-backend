import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AuthenticatedRequest } from "@/middleware/auth";
import prisma from "@/lib/prisma";

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export type RolePermissions = {
  [K in Role]: Permission[];
};

const USER_PERMISSIONS: Permission[] = [
  { resource: "profile", action: "read" },
  { resource: "profile", action: "update" },
  { resource: "portfolio", action: "read" },
  { resource: "portfolio", action: "create" },
  { resource: "portfolio", action: "update" },
  { resource: "investment", action: "read" },
  { resource: "investment", action: "create" },
  { resource: "transaction", action: "read" },
  { resource: "withdrawal", action: "create" },
  { resource: "withdrawal", action: "read" },
  { resource: "notification", action: "read" },
  { resource: "notification", action: "update" },
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  { resource: "user", action: "create" },
  { resource: "user", action: "read" },
  { resource: "user", action: "update" },
  { resource: "user", action: "suspend" },
  { resource: "user", action: "delete" },
  { resource: "transaction", action: "approve" },
  { resource: "withdrawal", action: "approve" },
  { resource: "withdrawal", action: "reject" },
  { resource: "package", action: "read" },
  { resource: "package", action: "create" },
  { resource: "package", action: "update" },
  { resource: "package", action: "delete" },
  { resource: "audit-log", action: "read" },
  { resource: "analytics", action: "read" },
  { resource: "system", action: "configure" },
  { resource: "backup", action: "create" },
  { resource: "backup", action: "restore" },
];

export const ROLE_PERMISSIONS: RolePermissions = {
  USER: USER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: ADMIN_PERMISSIONS,
};

export const OWNERSHIP_CHECKS: Record<
  string,
  (userId: string, resourceId: string) => Promise<boolean>
> = {
  portfolio: async (userId: string, portfolioId: string) => {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    return !!portfolio;
  },

  investment: async (userId: string, investmentId: string) => {
    const investment = await prisma.investment.findFirst({
      where: { id: investmentId, userId },
    });
    return !!investment;
  },

  transaction: async (userId: string, transactionId: string) => {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    return !!transaction;
  },

  withdrawal: async (userId: string, withdrawalId: string) => {
    const withdrawal = await prisma.withdrawal.findFirst({
      where: { id: withdrawalId, userId },
    });
    return !!withdrawal;
  },

  notification: async (userId: string, notificationId: string) => {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    return !!notification;
  },
};

export class AuthorizationService {
  static hasPermission(
    userRole: Role,
    resource: string,
    action: string,
  ): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return rolePermissions.some(
      (permission) =>
        permission.resource === resource && permission.action === action,
    );
  }

  static async checkOwnership(
    userId: string,
    resource: string,
    resourceId: string,
  ): Promise<boolean> {
    const ownershipCheck = OWNERSHIP_CHECKS[resource];
    if (!ownershipCheck) {
      return false;
    }
    return await ownershipCheck(userId, resourceId);
  }

  static async canAccessResource(
    userRole: Role,
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    targetUserId?: string,
  ): Promise<boolean> {
    if (!this.hasPermission(userRole, resource, action)) {
      return false;
    }

    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      return true;
    }

    if (resource !== "user" && resourceId) {
      return await this.checkOwnership(userId, resource, resourceId);
    }

    if (resource === "profile" || resource === "user") {
      return userId === targetUserId;
    }

    return true;
  }
}

export const requirePermission = (resource: string, action: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const { role, id: userId } = req.user;
      const resourceId = req.params.id || req.params.resourceId;
      const targetUserId = req.params.userId || req.body.userId;

      const hasAccess = await AuthorizationService.canAccessResource(
        role,
        userId,
        resource,
        action,
        resourceId,
        targetUserId,
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to access this resource",
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({
        success: false,
        message: "Authorization check failed",
        code: "AUTHORIZATION_ERROR",
      });
    }
  };
};

export const canReadUser = requirePermission("user", "read");
export const canUpdateUser = requirePermission("user", "update");
export const canDeleteUser = requirePermission("user", "delete");
export const canCreateUser = requirePermission("user", "create");

export const canReadPortfolio = requirePermission("portfolio", "read");
export const canUpdatePortfolio = requirePermission("portfolio", "update");
export const canCreatePortfolio = requirePermission("portfolio", "create");

export const canReadInvestment = requirePermission("investment", "read");
export const canCreateInvestment = requirePermission("investment", "create");

export const canReadTransaction = requirePermission("transaction", "read");
export const canApproveTransaction = requirePermission(
  "transaction",
  "approve",
);

export const canCreateWithdrawal = requirePermission("withdrawal", "create");
export const canApproveWithdrawal = requirePermission("withdrawal", "approve");
export const canRejectWithdrawal = requirePermission("withdrawal", "reject");

export const canReadAnalytics = requirePermission("analytics", "read");
export const canReadAuditLogs = requirePermission("audit-log", "read");

export const canManagePackages = requirePermission("package", "create");
export const canDeletePackages = requirePermission("package", "delete");

export const canImpersonate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only admins can impersonate users",
        code: "INSUFFICIENT_PERMISSIONS",
      });
      return;
    }

    const targetUserId = req.params.userId;
    if (!targetUserId) {
      res.status(400).json({
        success: false,
        message: "Target user ID is required",
        code: "INVALID_REQUEST",
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, status: true },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "Target user not found",
        code: "USER_NOT_FOUND",
      });
      return;
    }

    if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") {
      res.status(403).json({
        success: false,
        message: "Cannot impersonate other admins",
        code: "IMPERSONATION_FORBIDDEN",
      });
      return;
    }

    if (targetUser.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Cannot impersonate inactive users",
        code: "IMPERSONATION_FORBIDDEN",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Impersonation authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
      code: "AUTHORIZATION_ERROR",
    });
  }
};

export const validateOwnership = (resourceType: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      if (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") {
        next();
        return;
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        res.status(400).json({
          success: false,
          message: "Resource ID is required",
          code: "INVALID_REQUEST",
        });
        return;
      }

      const isOwner = await AuthorizationService.checkOwnership(
        req.user.id,
        resourceType,
        resourceId,
      );

      if (!isOwner) {
        res.status(403).json({
          success: false,
          message: "You do not have access to this resource",
          code: "RESOURCE_ACCESS_DENIED",
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Ownership validation error:", error);
      res.status(500).json({
        success: false,
        message: "Ownership validation failed",
        code: "VALIDATION_ERROR",
      });
    }
  };
};
