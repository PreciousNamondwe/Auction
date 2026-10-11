import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();
    // Destructure 'phone' from the frontend payload
    const { email, password, name, phone, role } = body;

    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
      role: role || "BIDDER",
      phoneNumber: phone || "",
    }).returning({ id: users.id });

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("❌ Registration Database Crash Details:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}