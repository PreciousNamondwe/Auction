import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const PAYCHANGU_BASE = "https://api.paychangu.com";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount, currency = "MWK", tx_ref, email,
      first_name, last_name, phone, method, purpose,
      callback_url, return_url,
    } = body;

    if (!amount || !tx_ref || !email || !purpose) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Idempotency check
    const [existing] = await db.select({ id: payments.id }).from(payments).where(eq(payments.reference, tx_ref)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Duplicate tx_ref" }, { status: 409 });
    }

    // Create pending record
    await db.insert(payments).values({
        reference: tx_ref,
        userId: parseInt(session.user.id),
        amount: parseFloat(amount),
        gatewayStatus: "pending",
        purpose,
      });

    const payload = {
      amount,
      currency,
      tx_ref,
      callback_url,
      return_url,
      email,
      first_name,
      last_name,
      customization: {
        title: `Bid265 - ${purpose}`,
        description: `Payment for ${purpose}`,
      },
      meta: {
        user_id: session.user.id,
        purpose,
        method,
        phone,
      },
    };

    console.log("[PayChangu] Sending payload:", JSON.stringify(payload, null, 2));

    const payRes = await fetch(`${PAYCHANGU_BASE}/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const payData = await payRes.json();
    console.log("[PayChangu] Raw response:", JSON.stringify(payData, null, 2));

    if (!payRes.ok) {
      await db.update(payments).set({ gatewayStatus: "failed" }).where(eq(payments.reference, tx_ref));
      return NextResponse.json(
        { error: payData.message || "PayChangu error", details: payData },
        { status: 502 }
      );
    }

    // Update DB
    await db.update(payments).set({ gatewayStatus: payData.data?.status || "pending" }).where(eq(payments.reference, tx_ref));

    // Extract checkout link — PayChangu may return it under different keys
    const checkoutUrl =
      payData.data?.link ||
      payData.data?.checkout_url ||
      payData.data?.url ||
      payData.link ||
      payData.checkout_url ||
      null;

    console.log("[PayChangu] Extracted checkoutUrl:", checkoutUrl);

    return NextResponse.json({
      success: true,
      checkoutUrl,
      tx_ref,
      status: payData.data?.status || payData.status || "pending",
      raw: payData, // Send full response for client-side debugging
    });
  } catch (error) {
    console.error("[PayChangu Initiate] CRASH:", error);
    return NextResponse.json(
      { error: "Internal error", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}