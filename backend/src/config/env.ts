import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

const isTest = process.env.NODE_ENV === "test";
const testEnvPath = path.resolve(process.cwd(), ".env.test");

if (isTest && fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  TRUST_PROXY: z
    .string()
    .default("false")
    .transform((val) => val === "true" || val === "1"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

if (parsed.data.NODE_ENV === "test") {
  let testDatabaseUrl: URL;
  try {
    testDatabaseUrl = new URL(parsed.data.DATABASE_URL);
  } catch {
    console.error("❌ Test DATABASE_URL must point to the dedicated local test database.");
    process.exit(1);
  }

  const databaseName = testDatabaseUrl.pathname.replace(/^\/+/, "");
  if (
    !["localhost", "127.0.0.1", "::1"].includes(testDatabaseUrl.hostname) ||
    databaseName !== "fashion_commerce_test"
  ) {
    console.error(
      "❌ Safety violation: tests require localhost database fashion_commerce_test; refusing to connect elsewhere."
    );
    process.exit(1);
  }
}

export const env = parsed.data;
