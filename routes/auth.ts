import { Router } from "express";
import { AuthController } from "../controllers/auth";
import { authenticateToken, authRateLimit } from "../middleware/auth";

const router = Router();

// Public authentication routes with rate limiting
router.post("/register", authRateLimit, AuthController.register);
router.post("/login", authRateLimit, AuthController.login);
router.post("/refresh", authRateLimit, AuthController.refreshToken);

// Protected authentication routes
router.post("/logout", authenticateToken, AuthController.logout);
router.post("/logout-all", authenticateToken, AuthController.logoutAll);
router.get("/me", authenticateToken, AuthController.me);

export default router;
