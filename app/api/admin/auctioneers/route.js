import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  try {
    const access = await requireAdmin();
    if (access.response) return access.response;

    const auctioneers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phoneNumber: users.phoneNumber,
      postalAddress: users.postalAddress,
      addressLine1: users.addressLine1,
      addressLine2: users.addressLine2,
      district: users.district,
      businessName: users.businessName,
      nationalId: users.nationalId,
      createdAt: users.createdAt,
    }).from(users).where(sql`${users.role} = 'AUCTIONEER'`)
      .orderBy(users.createdAt);

    return NextResponse.json({ auctioneers });
  } catch (error) {
    console.error("[Admin auctioneers GET]", error);
    return NextResponse.json({ error: "Could not load auctioneer accounts." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await requireAdmin();
    if (access.response) return access.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const postalAddress = typeof body.postalAddress === "string" ? body.postalAddress.trim() : "";
    const addressLine1 = typeof body.addressLine1 === "string" ? body.addressLine1.trim() : "";
    const addressLine2 = typeof body.addressLine2 === "string" ? body.addressLine2.trim() : "";
    const district = typeof body.district === "string" ? body.district.trim() : "";
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const nationalId = typeof body.nationalId === "string" ? body.nationalId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phoneNumber ||
      phoneNumber.length > 20 ||
      !postalAddress ||
      !addressLine1 ||
      !addressLine2 ||
      password.length < 12
    ) {
      return NextResponse.json({
        error: "Name, valid email, phone (maximum 20 characters), postal address, address lines 1 and 2, and a password of at least 12 characters are required.",
      }, { status: 400 });
    }

    const [existingUser] = await db.select({ id: users.id }).from(users)
      .where(sql`lower(trim(${users.email})) = ${email}`).limit(1);
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const [auctioneer] = await db.insert(users).values({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      phoneNumber,
      postalAddress,
      addressLine1,
      addressLine2,
      district: district || null,
      businessName: businessName || null,
      nationalId: nationalId || null,
      role: "AUCTIONEER",
      isVerified: true,
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phoneNumber: users.phoneNumber,
    });

    return NextResponse.json({ auctioneer }, { status: 201 });
  } catch (error) {
    console.error("[Admin auctioneers POST]", error);
    return NextResponse.json({ error: "Could not create the auctioneer account." }, { status: 500 });
  }
}
