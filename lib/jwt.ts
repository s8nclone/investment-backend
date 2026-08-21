import jwt, { SignOptions } from "jsonwebtoken";
import { JWTPayload, RefreshTokenPayload } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_jwt_key_change_in_production_12345";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_super_secret_refresh_key_change_in_production_12345";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export class JWTService {
  static generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "hyperloop-api",
      audience: "hyperloop-client",
    } as any);
  }

  static generateRefreshToken(
    payload: Omit<RefreshTokenPayload, "iat" | "exp">,
  ): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: "hyperloop-api",
      audience: "hyperloop-client",
    } as any);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "hyperloop-api",
        audience: "hyperloop-client",
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid token");
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token expired");
      }
      throw new Error("Token verification failed");
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: "hyperloop-api",
        audience: "hyperloop-client",
      }) as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid refresh token");
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Refresh token expired");
      }
      throw new Error("Refresh token verification failed");
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static getTokenExpirationTime(): number {
    // Convert JWT_EXPIRES_IN to milliseconds
    const expiresIn = JWT_EXPIRES_IN;

    if (typeof expiresIn === "string") {
      const unit = expiresIn.slice(-1);
      const value = parseInt(expiresIn.slice(0, -1));

      switch (unit) {
        case "s":
          return value * 1000;
        case "m":
          return value * 60 * 1000;
        case "h":
          return value * 60 * 60 * 1000;
        case "d":
          return value * 24 * 60 * 60 * 1000;
        default:
          return 15 * 60 * 1000; // Default 15 minutes
      }
    }

    return 15 * 60 * 1000; // Default 15 minutes
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
}
