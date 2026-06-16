// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Next.js TypeScript Seeding Engine Initialized...");

  const adminEmail = "admin@malawiauctions.com";
  const plainPassword = "SecureAdminPass123!"; 
  
  // Securely hash our production string
  const saltRounds = 10;
  const hashedSecurePassword = await bcrypt.hash(plainPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, 
    create: {
      name: "Platform Root Administrator",
      email: adminEmail,
      password: hashedSecurePassword,
      phoneNumber: "+265888123456", 
      role: Role.ADMIN, // Explicitly uses your Prisma Enum type
      isVerified: true,              
    },
  });

  console.log(`\n==================================================`);
  console.log(`✅ Admin Account successfully synchronized: ${adminUser.email}`);
  console.log(`🔑 Login Credentials:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${plainPassword}`);
  console.log(`==================================================\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding execution failure recorded:", e);
    await prisma.$disconnect();
    process.exit(1);
  });