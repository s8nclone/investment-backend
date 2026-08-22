import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@/lib/swagger";
import authRoutes from "@/routes/auth";
import dashboardRoutes from "@/routes/dashboard";
import adminRoutes from "@/routes/admin";
import { checkDatabaseConnection } from "@/lib/prisma";

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
  const swaggerUiOptions = {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API Docs",
    customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js",
    ],
  };
  
  app.use(
    "/api/docs",
    swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions),
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );
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

  app.get("/api/demo", (_req, res) => {
    res.json({ message: "Demo endpoint" });
  });

  // Authentication routes
  app.use("/api/auth", authRoutes);

  // Dashboard routes
  app.use("/api/dashboard", dashboardRoutes);

  // Admin routes
  app.use("/api/admin", adminRoutes);

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
