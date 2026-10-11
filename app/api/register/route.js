import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();
    // Destructure 'phone' from the frontend payload
    const { password, name, phone, role } = body;
    const normalizedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!normalizedEmail || typeof password !== "string" || !password || !name) {
      return NextResponse.json({ message: "Name, email, and password are required." }, { status: 400 });
    }

    const [existingUser] = await db.select({ id: users.id }).from(users)
      .where(sql`lower(trim(${users.email})) = ${normalizedEmail}`)
      .limit(1);
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email: normalizedEmail,
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