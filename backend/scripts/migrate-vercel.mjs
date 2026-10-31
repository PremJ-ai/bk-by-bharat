import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const isPreview = process.env.VERCEL_ENV === "preview";
const isApprovedProduction =
  process.env.VERCEL_ENV === "production" &&
  process.env.APPLY_PRODUCTION_MIGRATIONS === "true";

if (!isPreview && !isApprovedProduction) {
  console.log("Skipping migrations; Preview or explicit Production opt-in is required.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured for this Vercel environment.");
}

const environment = isPreview ? "Preview" : "Production";
console.log(`Applying pending migrations to the Vercel ${environment} database.`);
const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], {
  stdio: "inherit",
});
