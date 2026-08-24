import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AuthorizationService,
  canReadPortfolio,
  canImpersonate,
} from "@/middleware/authorization";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Authorization Middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("should check permission correctly for USER role", () => {
    const userRole = Role.USER;
    const canRead = AuthorizationService.hasPermission(userRole, "portfolio", "read");
    const canManageUsers = AuthorizationService.hasPermission(userRole, "user", "delete");

    expect(canRead).toBe(true);
    expect(canManageUsers).toBe(false);
  });

  it("should check permission correctly for SUPER_ADMIN role", () => {
    const superAdminRole = Role.SUPER_ADMIN;
    const canImpersonateUser = AuthorizationService.hasPermission(superAdminRole, "system", "configure");
    expect(canImpersonateUser).toBe(true);
  });

  it("should allow user to access portfolio read route", async () => {
    req.user = { id: "user_123", role: Role.USER };
    await canReadPortfolio(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should block non-superadmin from impersonation route", async () => {
    req.user = { id: "user_123", role: Role.USER };
    req.params = { userId: "target_123" };
    await canImpersonate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
