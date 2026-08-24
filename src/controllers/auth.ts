import { Request, Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { PasswordService } from "@/lib/password";
import { JWTService } from "@/lib/jwt";
import { AuthError, ValidationError, UserProfile } from "@/types/auth";
import { AuthenticatedRequest } from "@/middleware/auth";
import { registerSchema, loginSchema, refreshTokenSchema } from "@/schemas/auth.schemas";

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = registerSchema.parse(req.body);

      const passwordValidation = PasswordService.validatePasswordStrength(
        validatedData.password,
      );
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: "Password does not meet security requirements",
          errors: passwordValidation.errors,
        });
        return;
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: validatedData.email.toLowerCase() },
            ...(validatedData.username
              ? [{ username: validatedData.username }]
              : []),
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === validatedData.email.toLowerCase()) {
          res.status(409).json({
            success: false,
            message: "User with this email already exists",
            code: "EMAIL_EXISTS",
          });
          return;
        }
        if (existingUser.username === validatedData.username) {
          res.status(409).json({
            success: false,
            message: "Username already taken",
            code: "USERNAME_EXISTS",
          });
          return;
        }
      }

      const hashedPassword = await PasswordService.hashPassword(
        validatedData.password,
      );

      const user = await prisma.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          username: validatedData.username,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          password: hashedPassword,
          phone: validatedData.phone,
          role: "USER",
          status: "ACTIVE",
        },
      });

      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: "",
          refreshToken: "",
          expiresAt: sessionExpiry,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      const accessToken = JWTService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id,
      });

      const refreshToken = JWTService.generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
        tokenVersion: 1,
      });

      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: accessToken,
          refreshToken: refreshToken,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_REGISTER",
          entity: "User",
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        totalInvestment: Number(user.totalInvestment),
        currentBalance: Number(user.currentBalance),
        totalReturns: Number(user.totalReturns),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: userProfile,
          accessToken,
          refreshToken,
          expiresIn: JWTService.getTokenExpirationTime(),
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Registration failed",
        code: "REGISTRATION_ERROR",
      });
    }
  }

  // Sign in existing user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: validatedData.email.toLowerCase() },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        });
        return;
      }

      if (user.status !== "ACTIVE") {
        res.status(403).json({
          success: false,
          message: "Account is not active",
          code: "ACCOUNT_INACTIVE",
        });
        return;
      }

      const isPasswordValid = await PasswordService.comparePassword(
        validatedData.password,
        user.password,
      );

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        });
        return;
      }

      if (!validatedData.rememberMe) {
        await prisma.session.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
        });
      }

      const sessionExpiry = new Date(
        Date.now() +
          (validatedData.rememberMe
            ? 30 * 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000),
      );

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: "",
          refreshToken: "",
          expiresAt: sessionExpiry,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      const accessToken = JWTService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id,
      });

      const refreshToken = JWTService.generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
        tokenVersion: 1,
      });

      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: accessToken,
          refreshToken: refreshToken,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN",
          entity: "User",
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        totalInvestment: Number(user.totalInvestment),
        currentBalance: Number(user.currentBalance),
        totalReturns: Number(user.totalReturns),
        createdAt: user.createdAt,
        lastLoginAt: new Date(),
      };

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: userProfile,
          accessToken,
          refreshToken,
          expiresIn: JWTService.getTokenExpirationTime(),
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Login failed",
        code: "LOGIN_ERROR",
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);

      const decoded = JWTService.verifyRefreshToken(validatedData.refreshToken);

      const session = await prisma.session.findUnique({
        where: {
          id: decoded.sessionId,
          refreshToken: validatedData.refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
          code: "INVALID_REFRESH_TOKEN",
        });
        return;
      }

      if (session.user.status !== "ACTIVE") {
        res.status(403).json({
          success: false,
          message: "Account is not active",
          code: "ACCOUNT_INACTIVE",
        });
        return;
      }

      const accessToken = JWTService.generateAccessToken({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
      });

      await prisma.session.update({
        where: { id: session.id },
        data: { token: accessToken },
      });

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken,
          expiresIn: JWTService.getTokenExpirationTime(),
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);

      if (error instanceof Error && error.message.includes("token")) {
        res.status(401).json({
          success: false,
          message: "Invalid refresh token",
          code: "INVALID_REFRESH_TOKEN",
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Token refresh failed",
        code: "REFRESH_ERROR",
      });
    }
  }

  // Logout single user
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      await prisma.session.update({
        where: { id: req.user.sessionId },
        data: { isActive: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: "USER_LOGOUT",
          entity: "User",
          entityId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Logout failed",
        code: "LOGOUT_ERROR",
      });
    }
  }

  // Logout all users
  static async logoutAll(
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

      await prisma.session.updateMany({
        where: { userId: req.user.id, isActive: true },
        data: { isActive: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: "USER_LOGOUT_ALL",
          entity: "User",
          entityId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      res.json({
        success: true,
        message: "Logged out from all devices successfully",
      });
    } catch (error) {
      console.error("Logout all error:", error);
      res.status(500).json({
        success: false,
        message: "Logout all failed",
        code: "LOGOUT_ALL_ERROR",
      });
    }
  }

  // Get single user profile
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          status: true,
          emailVerified: true,
          twoFactorEnabled: true,
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

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        totalInvestment: Number(user.totalInvestment),
        currentBalance: Number(user.currentBalance),
        totalReturns: Number(user.totalReturns),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };

      res.json({
        success: true,
        data: { user: userProfile },
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user profile",
        code: "PROFILE_ERROR",
      });
    }
  }
}
