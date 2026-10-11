import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPaymentReceipt } from "@/lib/paymentReceipts";
import { syncListingSalePayment } from "@/lib/paymentSales";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tx_ref = searchParams.get("tx_ref");

    if (!tx_ref) {
      return NextResponse.json({ error: "Missing tx_ref" }, { status: 400 });
    }

    // Verify ownership
    const [payment] = await db.select().from(payments).where(eq(payments.reference, tx_ref)).limit(1);

    if (!payment || payment.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify with PayChangu
    const verifyRes = await fetch(
      `https://api.paychangu.com/verify-payment/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const verifyData = await verifyRes.json();
    const status = verifyData.data?.status || payment.gatewayStatus;

    const mappedStatus =
      status === "success"
        ? "completed"
        : status === "failed"
        ? "failed"
        : status || "pending";

    if (mappedStatus !== payment.gatewayStatus) {
      await db.update(payments).set({ gatewayStatus: mappedStatus }).where(eq(payments.reference, tx_ref));
    }
    await syncListingSalePayment(tx_ref, mappedStatus);
    const receiptEmailed = mappedStatus === "completed" ? await sendPaymentReceipt(tx_ref) : false;

    return NextResponse.json({
      tx_ref,
      status: mappedStatus,
      receiptEmailed,
      data: verifyData.data,
    });
  } catch (error) {
    console.error("[PayChangu Status]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}