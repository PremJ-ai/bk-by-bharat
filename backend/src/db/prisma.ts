import { PrismaClient } from "@prisma/client";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

if (env.NODE_ENV === "test" && env.DATABASE_URL.includes("supabase.com")) {
  throw new Error("CRITICAL SAFETY BLOCK: Tests cannot be executed against production Supabase database!");
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, "Database connection check failed");
    return false;
  }
}
