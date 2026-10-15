import { NextResponse } from "next/server";
import { and, asc, count, eq, ilike, ne, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const userRoles = ["BIDDER", "AUCTIONEER", "ADMIN"];

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

export async function GET(request) {
  try {
    const access = await requireAdmin();
    if (access.response) return access.response;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().slice(0, 100);
    const role = searchParams.get("role") || "ALL";
    const pageValue = Number(searchParams.get("page") || 1);
    const pageSizeValue = Number(searchParams.get("pageSize") || 25);
    if (!Number.isInteger(pageValue) || pageValue < 1 || !Number.isInteger(pageSizeValue) || pageSizeValue < 1) {
      return NextResponse.json({ error: "Invalid pagination parameters." }, { status: 400 });
    }
    if (role !== "ALL" && !userRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid user role filter." }, { status: 400 });
    }
    const pageSize = Math.min(pageSizeValue, 100);
    const offset = (pageValue - 1) * pageSize;
    const filters = [];
    if (role !== "ALL") filters.push(eq(users.role, role));
    if (query) {
      const search = `%${query}%`;
      filters.push(or(
        ilike(users.name, search),
        ilike(users.email, search),
        ilike(users.phoneNumber, search),
        ilike(users.postalAddress, search),
        ilike(users.addressLine1, search),
        ilike(users.addressLine2, search),
        ilike(users.district, search),
        ilike(users.businessName, search),
      ));
    }
    const where = filters.length ? and(...filters) : undefined;

    const [rows, totals, roleTotals] = await Promise.all([
      db.select({
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
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      }).from(users).where(where).orderBy(asc(users.name), asc(users.id)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(users).where(where),
      db.select({ role: users.role, total: count() }).from(users).groupBy(users.role),
    ]);
    const total = totals[0]?.total || 0;
    const counts = Object.fromEntries(userRoles.map((userRole) => [
      userRole,
      roleTotals.find((entry) => entry.role === userRole)?.total || 0,
    ]));

    return NextResponse.json({
      users: rows,
      total,
      page: pageValue,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      counts,
    });
  } catch (error) {
    console.error("[Admin users GET]", error);
    return NextResponse.json({ error: "Could not load user accounts." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdmin();
    if (access.response) return access.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const userId = Number(body?.userId);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const role = body?.role;
    const isVerified = body?.isVerified;
    const optionalText = (value, maxLength) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value !== "string" || value.trim().length > maxLength) return undefined;
      return value.trim() || null;
    };
    const postalAddress = optionalText(body?.postalAddress, 255);
    const addressLine1 = optionalText(body?.addressLine1, 255);
    const addressLine2 = optionalText(body?.addressLine2, 255);
    const district = optionalText(body?.district, 100);
    const businessName = optionalText(body?.businessName, 191);
    const nationalId = optionalText(body?.nationalId, 100);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "A valid user ID is required." }, { status: 400 });
    }
    if (!name || name.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
      return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
    }
    if (phoneNumber.length > 20 || !userRoles.includes(role) || typeof isVerified !== "boolean") {
      return NextResponse.json({ error: "Enter a valid phone number, role, and verification status." }, { status: 400 });
    }
    if ([postalAddress, addressLine1, addressLine2, district, businessName, nationalId].includes(undefined)) {
      return NextResponse.json({ error: "One or more address or organization fields exceed the allowed length." }, { status: 400 });
    }

    const currentAdminId = Number(access.session.user.id);
    if (userId === currentAdminId && (role !== "ADMIN" || !isVerified)) {
      return NextResponse.json({ error: "You cannot remove administrator access or verification from your own account." }, { status: 400 });
    }

    const [emailOwner] = await db.select({ id: users.id }).from(users)
      .where(and(sql`lower(trim(${users.email})) = ${email}`, ne(users.id, userId)))
      .limit(1);
    if (emailOwner) {
      return NextResponse.json({ error: "Another account already uses this email address." }, { status: 409 });
    }

    const [updated] = await db.update(users).set({
      name,
      email,
      phoneNumber,
      postalAddress,
      addressLine1,
      addressLine2,
      district,
      businessName,
      nationalId,
      role,
      isVerified,
    }).where(eq(users.id, userId)).returning({
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
      role: users.role,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
    });
    if (!updated) return NextResponse.json({ error: "User account not found." }, { status: 404 });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Another account already uses this email address." }, { status: 409 });
    }
    console.error("[Admin users PATCH]", error);
    return NextResponse.json({ error: "Could not update user account." }, { status: 500 });
  }
}
