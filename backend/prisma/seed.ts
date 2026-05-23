import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@bibregister.com" },
    update: {},
    create: {
      email: "admin@bibregister.com",
      password,
      name: "Super Admin",
    },
  });
  console.log("Admin seeded:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
