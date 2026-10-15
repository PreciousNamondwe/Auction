import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

async function getAuthorizedPayment(reference, session) {
  const [payment] = await db.select().from(payments)
    .where(eq(payments.reference, reference))
    .limit(1);

  if (!payment) {
    return { response: NextResponse.json({ error: "Payment not found" }, { status: 404 }) };
  }

  if (session.user.role !== "ADMIN" && payment.userId !== Number(session.user.id)) {
    return { response: NextResponse.json({ error: "Payment not found" }, { status: 404 }) };
  }

  return { payment };
}

export async function GET(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await params;
    const result = await getAuthorizedPayment(reference, session);
    if (result.response) return result.response;

    return NextResponse.json({ payment: result.payment });
  } catch (error) {
    console.error("[Payment GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "";
    if (!purpose || purpose.length > 200) {
      return NextResponse.json({ error: "Purpose must be between 1 and 200 characters" }, { status: 400 });
    }

    const { reference } = await params;
    const result = await getAuthorizedPayment(reference, session);
    if (result.response) return result.response;

    const [payment] = await db.update(payments)
      .set({ purpose })
      .where(eq(payments.reference, reference))
      .returning();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("[Payment PATCH]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reference } = await params;
    const result = await getAuthorizedPayment(reference, session);
    if (result.response) return result.response;
    if (!["pending", "failed"].includes(result.payment.gatewayStatus.toLowerCase())) {
      return NextResponse.json(
        { error: "Only pending or failed payments can be deleted" },
        { status: 409 }
      );
    }

    const [deletedPayment] = await db.delete(payments)
      .where(and(
        eq(payments.reference, reference),
        sql`lower(${payments.gatewayStatus}) in ('pending', 'failed')`
      ))
      .returning({ reference: payments.reference });

    if (!deletedPayment) {
      return NextResponse.json(
        { error: "Payment status changed; refresh and try again" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, reference: deletedPayment.reference });
  } catch (error) {
    console.error("[Payment DELETE]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
