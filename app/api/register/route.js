import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

// Clean JavaScript global object caching for development hot-reloads
const globalForPrisma = globalThis;

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL || "mysql://root:precious@127.0.0.1:3306/e-auction";
  const dbUrl = new URL(connectionString);

  const dbAdapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || "3306", 10),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace("/", ""),
  });

  const client = new PrismaClient({ adapter: dbAdapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export async function POST(req) {
  try {
    const body = await req.json();
    // Destructure 'phone' from the frontend payload
    const { email, password, name, phone, role } = body;

    const prisma = getPrismaClient();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || "BIDDER",
        phoneNumber: phone // FIXED: Maps the 'phone' variable to your schema's 'phoneNumber' field
      }
    });

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("❌ Registration Database Crash Details:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}