import { Request, Response, NextFunction } from "express";
import { JWTService } from "../lib/jwt";
import { AuthError, AuthenticatedRequest } from "../types/auth";
import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

export { AuthenticatedRequest };

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token required",
        code: "TOKEN_MISSING",
      });
      return;
    }

    // Verify the token
    const decoded = JWTService.verifyAccessToken(token);

    // Check if session exists and is active
    const session = await prisma.session.findUnique({
      where: {
        id: decoded.sessionId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired session",
        code: "SESSION_INVALID",
      });
      return;
    }

    // Check if user account is active
    if (session.user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Account is not active",
        code: "ACCOUNT_INACTIVE",
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error instanceof Error) {
      if (error.message === "Token expired") {
        res.status(401).json({
          success: false,
          message: "Access token expired",
          code: "TOKEN_EXPIRED",
        });
        return;
      }

      if (error.message === "Invalid token") {
        res.status(401).json({
          success: false,
          message: "Invalid access token",
          code: "TOKEN_INVALID",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Authentication error",
      code: "AUTH_ERROR",
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = JWTService.verifyAccessToken(token);

    const session = await prisma.session.findUnique({
      where: {
        id: decoded.sessionId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (session && session.user.status === "ACTIVE") {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
      };
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    console.log(
      "Optional auth failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  next();
};

export const requireRole = (roles: Role | Role[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(["ADMIN", "SUPER_ADMIN"]);
export const requireSuperAdmin = requireRole("SUPER_ADMIN");

// Rate limiting middleware
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100,
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || "unknown";
    const now = Date.now();

    let requestInfo = requests.get(identifier);

    if (!requestInfo || now > requestInfo.resetTime) {
      requestInfo = {
        count: 1,
        resetTime: now + windowMs,
      };
      requests.set(identifier, requestInfo);
    } else {
      requestInfo.count++;
    }

    const remaining = maxRequests - requestInfo.count;
    const resetTime = Math.ceil((requestInfo.resetTime - now) / 1000);

    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
      "X-RateLimit-Reset": resetTime.toString(),
    });

    if (requestInfo.count > maxRequests) {
      res.status(429).json({
        success: false,
        message: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: resetTime,
      });
      return;
    }

    next();
  };
};

// Auth rate limiter for login/register endpoints
export const authRateLimit = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "5"), // 5 requests per window
);
