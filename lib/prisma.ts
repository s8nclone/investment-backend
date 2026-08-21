import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;

// Helper function to handle Prisma disconnection
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Helper function to check database connection
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
