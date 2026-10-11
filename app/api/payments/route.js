import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPayments = session.user.role === "ADMIN"
      ? await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(50)
      : await db.select().from(payments)
        .where(eq(payments.userId, Number(session.user.id)))
        .orderBy(desc(payments.createdAt))
        .limit(50);

    return NextResponse.json({ payments: userPayments });
  } catch (error) {
    console.error("[Payments GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}