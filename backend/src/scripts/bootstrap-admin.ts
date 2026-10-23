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
    if (arg.startsWith("--username=")) {
      username = arg.split("=")[1];
    } else if (arg.startsWith("--password=")) {
      password = arg.split("=")[1];
    }
  }

  // Interactive prompt fallback
  if (!username || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!username) {
        username = await rl.question("Enter Administrator Username / Email: ");
      }
      if (!password) {
        password = await rl.question("Enter Strong Password (min 8 chars): ");
      }
    } finally {
      rl.close();
    }
  }

  username = username.trim();
  if (!username || username.length < 3) {
    console.error("❌ Error: Username must be at least 3 characters.");
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("❌ Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  try {
    const admin = await adminAuthService.bootstrapFirstAdmin(username, password);
    console.log("\n✅ Administrator created successfully!");
    console.log(`- ID: ${admin.id}`);
    console.log(`- Username: ${admin.username}`);
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
