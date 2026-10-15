import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auctionAccessPayments, payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createHmac } from "crypto";
import { sendPaymentReceipt } from "@/lib/paymentReceipts";
import { syncListingSalePayment } from "@/lib/paymentSales";

const WEBHOOK_SECRET = process.env.PAYCHANGU_SECRET_KEY; // Same as API key

export async function GET() {
  return NextResponse.json(
    {
      error: "This is a PayChangu webhook endpoint, not a web page.",
      message: "PayChangu must send a signed POST request to this URL.",
      method: "POST",
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}

async function attemptReceiptEmail(reference) {
  try {
    return { sent: await sendPaymentReceipt(reference), error: null };
  } catch (error) {
    console.error("[PayChangu Webhook] Payment was recorded, but receipt email failed:", error);
    return { sent: false, error: "Payment recorded, but receipt email could not be sent." };
  }
}

export async function POST(request) {
  try {
    // ── 1. Verify webhook signature ──
    const signature = request.headers.get("signature");
    const payload = await request.text(); // raw body

    if (!WEBHOOK_SECRET) {
      console.error("[PayChangu Webhook] PAYCHANGU_SECRET_KEY is not configured.");
      return NextResponse.json({ error: "Webhook verification is not configured" }, { status: 500 });
    }
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const computed = createHmac("sha256", WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    if (computed !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // ── 2. Parse payload ──
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // PayChangu uses "reference" in webhooks, not "tx_ref"
    const tx_ref = data.reference || data.tx_ref;
    const status = data.status;
    const amount = data.amount;

    if (!tx_ref) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // ── 3. Idempotency ──
    if (typeof tx_ref !== "string" || !tx_ref.trim()) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }
    const [existing] = await db.select().from(payments).where(eq(payments.reference, tx_ref)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Unknown payment reference" }, { status: 404 });
    }
    if (existing.gatewayStatus === "completed") {
      await syncListingSalePayment(tx_ref, "completed");
      const receipt = await attemptReceiptEmail(tx_ref);
      return NextResponse.json({
        received: true,
        alreadyProcessed: true,
        receiptEmailSent: receipt.sent,
        ...(receipt.error ? { receiptEmailError: receipt.error } : {}),
      });
    }

    if (amount != null && Number(amount) !== Number(existing.amount)) {
      console.error("[PayChangu Webhook] Amount mismatch for payment:", tx_ref);
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    // ── 4. Map status ──
    const normalizedStatus = String(status || "").toLowerCase();
    const mappedStatus =
      normalizedStatus === "success"
        ? "completed"
        : normalizedStatus === "failed"
        ? "failed"
        : "pending";

    // ── 5. Update DB ──
    await db.transaction(async (tx) => {
      await tx.update(payments).set({ gatewayStatus: mappedStatus })
        .where(eq(payments.reference, tx_ref));
      await tx.update(auctionAccessPayments).set({
        status: mappedStatus === "completed" ? "PAID" : mappedStatus === "failed" ? "FAILED" : "PENDING",
        paidAt: mappedStatus === "completed" ? new Date() : null,
      }).where(and(
        eq(auctionAccessPayments.paymentRef, tx_ref),
        eq(auctionAccessPayments.userId, existing.userId),
      ));
    });
    await syncListingSalePayment(tx_ref, mappedStatus);

    if (mappedStatus === "completed") {
      console.log("[PayChangu] Payment completed:", tx_ref);
      const receipt = await attemptReceiptEmail(tx_ref);
      return NextResponse.json({
        received: true,
        status: mappedStatus,
        receiptEmailSent: receipt.sent,
        ...(receipt.error ? { receiptEmailError: receipt.error } : {}),
      });
    }

    return NextResponse.json({ received: true, status: mappedStatus });
  } catch (error) {
    console.error("[PayChangu Webhook Error]", error);
    return NextResponse.json({ received: false, error: "Webhook processing failed" }, { status: 500 });
  }
}