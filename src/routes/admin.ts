import { Router } from "express";
import { AdminController } from "@/controllers/admin";
import { authenticateToken, requireAdmin } from "@/middleware/auth";
import { canImpersonate } from "@/middleware/authorization";

const router = Router();

// All admin routes require authentication and admin permissions
router.use(authenticateToken, requireAdmin);

// Admin Dashboard & Stats
router.get("/stats", AdminController.getAdminStats);

// User Management Routes
router.get("/users", AdminController.getAllUsers);
router.post("/users", AdminController.createUser);
router.get("/users/:userId", AdminController.getUserById);
router.put("/users/:userId/profile", AdminController.updateUserProfile);
router.put("/users/:userId/investments", AdminController.updateUserInvestments);
router.put("/users/:userId/transactions", AdminController.updateUserTransactions);
router.put("/users/:userId/packages", AdminController.updateUserPackages);
router.put("/users/:userId/withdrawals", AdminController.updateUserWithdrawals);
router.delete("/users/:userId", AdminController.deleteUser);

// Admin Impersonation Route
router.post("/impersonate/:userId", canImpersonate, AdminController.impersonateUser);

export default router;
