import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";
import { sendPaymentReceipt } from "@/lib/paymentReceipts";

const WEBHOOK_SECRET = process.env.PAYCHANGU_SECRET_KEY; // Same as API key

export async function POST(request) {
  try {
    // ── 1. Verify webhook signature ──
    const signature = request.headers.get("signature");
    const payload = await request.text(); // raw body

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
    const data = JSON.parse(payload);
    console.log("[PayChangu Webhook]", data);

    // PayChangu uses "reference" in webhooks, not "tx_ref"
    const tx_ref = data.reference || data.tx_ref;
    const status = data.status;
    const amount = data.amount;

    if (!tx_ref) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // ── 3. Idempotency ──
    const [existing] = await db.select().from(payments).where(eq(payments.reference, tx_ref)).limit(1);

    if (existing?.gatewayStatus === "completed") {
      await sendPaymentReceipt(tx_ref);
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // ── 4. Map status ──
    const mappedStatus =
      status === "success"
        ? "completed"
        : status === "failed"
        ? "failed"
        : status || "pending";

    // ── 5. Update DB ──
    await db.update(payments).set({
        gatewayStatus: mappedStatus,
        amount: amount ? parseFloat(amount) : existing?.amount,
      }).where(eq(payments.reference, tx_ref));

    if (mappedStatus === "completed") {
      console.log("[PayChangu] Payment completed:", tx_ref);
      await sendPaymentReceipt(tx_ref);
    }

    return NextResponse.json({ received: true, status: mappedStatus });
  } catch (error) {
    console.error("[PayChangu Webhook Error]", error);
    return NextResponse.json({ received: false, error: "Webhook processing failed" }, { status: 500 });
  }
}