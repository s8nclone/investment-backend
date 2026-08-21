import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger";
import { handleDemo } from "./routes/demo";
import {
  getAllUsers,
  getUserById,
  updateUserProfile,
  updateUserInvestments,
  updateUserTransactions,
  updateUserPackages,
  updateUserWithdrawals,
  createUser,
  deleteUser,
  getAdminStats,
  impersonateUser,
} from "./routes/admin";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import { checkDatabaseConnection } from "./lib/prisma";

export function createServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173" || "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Interactive Swagger API Documentation
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Health check and database connection
  app.get("/api/health", async (_req, res) => {
    const dbConnected = await checkDatabaseConnection();
    res.json({
      status: "ok",
      database: dbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      documentation: "/api/docs",
    });
  });

  // API ping endpoint
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.use("/api/auth", authRoutes);

  // Dashboard routes
  app.use("/api/dashboard", dashboardRoutes);

  // Admin API routes
  app.get("/api/admin/users", ...getAllUsers);
  app.get("/api/admin/users/:userId", ...getUserById);
  app.put("/api/admin/users/:userId/profile", ...updateUserProfile);
  app.put("/api/admin/users/:userId/investments", ...updateUserInvestments);
  app.put("/api/admin/users/:userId/transactions", ...updateUserTransactions);
  app.put("/api/admin/users/:userId/packages", ...updateUserPackages);
  app.put("/api/admin/users/:userId/withdrawals", ...updateUserWithdrawals);
  app.post("/api/admin/users", ...createUser);
  app.delete("/api/admin/users/:userId", ...deleteUser);
  app.get("/api/admin/stats", ...getAdminStats);
  app.post("/api/admin/impersonate/:userId", ...impersonateUser);

  // Global Centralized Error Handler Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled Application Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL_SERVER_ERROR",
    });
  });

  return app;
}
