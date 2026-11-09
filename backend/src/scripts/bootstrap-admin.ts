import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { adminAuthService } from "../modules/admin-auth/admin-auth.service.js";
import { adminAuthRepository } from "../modules/admin-auth/admin-auth.repository.js";
import { prisma } from "../db/prisma.js";

async function main() {
  console.log("\n==============================================");
  console.log("🔐 Fashion E-Commerce - One-Time Admin Bootstrap");
  console.log("==============================================\n");

  const existingCount = await adminAuthRepository.countAdmins();
  if (existingCount > 0) {
    console.error("❌ Refused: An administrator already exists in the database.");
    console.error("Public or duplicate admin registration is prohibited.\n");
    process.exit(1);
  }

  // Parse command line flags if provided (e.g. for scripted deployment / testing)
  const args = process.argv.slice(2);
  let username = "";
  let password = "";

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      username = arg.slice("--email=".length);
    } else if (arg.startsWith("--username=")) {
      // Backward-compatible flag; the value must now be a real email address.
      username = arg.slice("--username=".length);
    } else if (arg.startsWith("--password=")) {
      password = arg.slice("--password=".length);
    }
  }

  // Interactive prompt fallback
  if (!username || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!username) {
        username = await rl.question("Enter Administrator Email: ");
      }
      if (!password) {
        password = await rl.question("Enter Strong Password (min 14 characters): ");
      }
    } finally {
      rl.close();
    }
  }

  username = username.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
    console.error("❌ Error: Administrator login must be a valid email address.");
    process.exit(1);
  }

  if (!password || password.length < 14 || password.length > 128) {
    console.error("❌ Error: Password must be between 14 and 128 characters.");
    process.exit(1);
  }

  try {
    const admin = await adminAuthService.bootstrapFirstAdmin(username, password);
    console.log("\n✅ Administrator created successfully!");
    console.log(`- ID: ${admin.id}`);
    console.log(`- Email: ${admin.username}`);
    console.log(`- Role: ${admin.role}`);
    console.log(`- Status: ${admin.status}`);
    console.log("\nYou may now log in at /admin/login\n");
  } catch (error: any) {
    console.error(`❌ Bootstrap failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
