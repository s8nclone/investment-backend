import { Router } from "express";
import { DashboardController } from "@/controllers/dashboard";
import { authenticateToken } from "@/middleware/auth";
import {
  canReadPortfolio,
  canCreatePortfolio,
  canReadInvestment,
  canCreateInvestment,
  canReadTransaction,
  canCreateWithdrawal,
} from "@/middleware/authorization";

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Dashboard overview
router.get("/overview", DashboardController.getDashboardOverview);

// Portfolio routes
router.get("/portfolios", canReadPortfolio, DashboardController.getPortfolios);
router.post(
  "/portfolios",
  canCreatePortfolio,
  DashboardController.createPortfolio,
);

// Investment routes
router.get(
  "/investments",
  canReadInvestment,
  DashboardController.getInvestments,
);
router.post(
  "/investments",
  canCreateInvestment,
  DashboardController.createInvestment,
);

// Transaction routes
router.get(
  "/transactions",
  canReadTransaction,
  DashboardController.getTransactions,
);

// Withdrawal routes
router.post(
  "/withdrawals",
  canCreateWithdrawal,
  DashboardController.createWithdrawal,
);

// Deposit routes
router.post("/deposit", DashboardController.createDeposit);

export default router;
