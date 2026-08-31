
import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const email =
    process.env.ADMIN_EMAIL ||
    "admin@ukrtradehub.com";

  const password =
    process.env.ADMIN_PASSWORD ||
    "ChangeMe123!";

  const passwordHash =
    await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: {
      email,
    },

    update: {
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      isBlocked: false,
      blockedAt: null,
      blockedReason: null,
    },

    create: {
      email,
      passwordHash,
      name: "UkrTradeHub Admin",
      role: "ADMIN",
      status: "ACTIVE",
      isBlocked: false,
    },
  });

  console.log("");
  console.log("======================================");
  console.log("       UkrTradeHub ADMIN");
  console.log("======================================");
  console.log("ID:", admin.id);
  console.log("Email:", email);
  console.log("Role:", admin.role);
  console.log("Status:", admin.status);
  console.log("======================================");
  console.log("");
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

