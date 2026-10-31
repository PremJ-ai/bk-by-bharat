import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

if (process.env.VERCEL_ENV !== "preview") {
  console.log("Skipping automatic migration outside a Vercel Preview build.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured for the Vercel Preview environment.");
}

console.log("Applying pending migrations to the Vercel Preview database.");
const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], {
  stdio: "inherit",
});
