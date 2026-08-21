import { Request } from "express";
import { User, Role, UserStatus } from "@prisma/client";

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  totalInvestment: number;
  currentBalance: number;
  totalReturns: number;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyRequest {
  token: string;
  code: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  avatar?: string;
}

export interface GetUsersQuery {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: string;
  limit?: string;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

// Error types
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code?: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
