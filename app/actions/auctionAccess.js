"use server";

import { randomUUID } from "node:crypto";
import { auth } from "../../auth";
import { db } from "@/lib/db";
import { auctionAccessPayments, auctionItems, payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { sendPaymentReceipt } from "@/lib/paymentReceipts";

const DEFAULT_BIDDING_FEE = 5000;
const DEFAULT_SECURITY_DEPOSIT = 50000;

function getRequiredAmount(value, defaultAmount) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : defaultAmount;
}

/**
 * 🎟 LIVE AUCTION ACCESS GATE
 *
 * Document flow: a bidder or auctioneer who wants to join a live auction must:
 *   1. Pay the BIDDING FEE first.
 *   2. On confirmation, pay the SECURITY DEPOSIT (guarantee they honour their bid).
 *   3. Only after BOTH payments are confirmed does the system direct them to the auction room.
 */

/**
 * Get the user's payment progress for a live auction lot.
 * Returns which step of the fee sequence is next (or ACCESS_GRANTED when done).
 */
export async function getAuctionAccessStatus(auctionItemId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (isNaN(cleanId)) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const item = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      columns: {
        id: true,
        status: true,
        biddingFee: true,
        depositAmount: true,
        liveRoomId: true,
        startingBid: true,
      },
      with: { asset: { columns: { title: true, location: true } } },
    });

    if (!item) {
      return { success: false, error: "Auction item not found." };
    }

    const accessPayments = await db.select().from(auctionAccessPayments).where(and(
      eq(auctionAccessPayments.userId, Number(session.user.id)),
      eq(auctionAccessPayments.auctionItemId, cleanId),
    ));

    const biddingFeePayment = accessPayments.find((p) => p.feeType === "BIDDING_FEE");
    const depositPayment = accessPayments.find((p) => p.feeType === "SECURITY_DEPOSIT");

    const biddingFeePaid = biddingFeePayment?.status === "PAID";
    const depositPaid = depositPayment?.status === "PAID";

    let nextStep;
    if (!biddingFeePaid) {
      nextStep = "BIDDING_FEE";
    } else if (!depositPaid) {
      nextStep = "SECURITY_DEPOSIT";
    } else {
      nextStep = "ACCESS_GRANTED";
    }

    return {
      success: true,
      data: {
        auctionItemId: item.id,
        status: item.status,
        liveRoomId: item.liveRoomId,
        itemTitle: item.asset?.title || "Auction Lot",
        location: item.asset?.location || "",
        startingBid: Number(item.startingBid),
        biddingFee: getRequiredAmount(item.biddingFee, DEFAULT_BIDDING_FEE),
        depositAmount: getRequiredAmount(item.depositAmount, DEFAULT_SECURITY_DEPOSIT),
        biddingFeePaid,
        depositPaid,
        nextStep,
        pendingBiddingFeeRef: biddingFeePayment?.status === "PENDING" ? biddingFeePayment.paymentRef : null,
        pendingDepositRef: depositPayment?.status === "PENDING" ? depositPayment.paymentRef : null,
      },
    };
  } catch (error) {
    console.error("❌ Access status failure:", error);
    return { success: false, error: error.message || "Failed to read auction access status." };
  }
}

/**
 * Step 1 — begin the BIDDING FEE payment for a live auction lot.
 * Creates a PENDING access record with a server-generated payment reference.
 */
async function startAccessFeePayment(auctionItemId, feeType) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (!Number.isInteger(cleanId) || cleanId <= 0) {
      return { success: false, error: "Invalid auction access payment parameters." };
    }

    const item = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      columns: feeType === "BIDDING_FEE" ? { biddingFee: true } : { depositAmount: true },
    });
    if (!item) return { success: false, error: "Auction item not found." };

    const amount = feeType === "BIDDING_FEE"
      ? getRequiredAmount(item.biddingFee, DEFAULT_BIDDING_FEE)
      : getRequiredAmount(item.depositAmount, DEFAULT_SECURITY_DEPOSIT);

    const [existing] = await db.select().from(auctionAccessPayments).where(and(
      eq(auctionAccessPayments.userId, Number(session.user.id)),
      eq(auctionAccessPayments.auctionItemId, cleanId),
      eq(auctionAccessPayments.feeType, feeType),
    )).limit(1);
    if (existing?.status === "PAID") {
      return { success: true, data: { id: existing.id, amount: Number(existing.amount), alreadyPaid: true } };
    }
    if (existing?.status === "PENDING" && existing.paymentRef) {
      const [pendingLedgerPayment] = await db.select({ gatewayStatus: payments.gatewayStatus })
        .from(payments)
        .where(eq(payments.reference, existing.paymentRef))
        .limit(1);
      if (pendingLedgerPayment?.gatewayStatus === "pending") {
        return {
          success: true,
          data: {
            id: existing.id,
            amount: Number(existing.amount),
            paymentRef: existing.paymentRef,
            alreadyPending: true,
          },
        };
      }
    }

    const paymentRef = `BID265-${randomUUID()}`;
    const [record] = await db.insert(auctionAccessPayments).values({
      userId: Number(session.user.id),
      auctionItemId: cleanId,
      feeType,
      amount: String(amount),
      paymentRef,
      status: "PENDING",
    }).onConflictDoUpdate({
      target: [auctionAccessPayments.userId, auctionAccessPayments.auctionItemId, auctionAccessPayments.feeType],
      set: { amount: String(amount), paymentRef, status: "PENDING", paidAt: null },
    }).returning();

    return { success: true, data: { id: record.id, amount: Number(record.amount), paymentRef: record.paymentRef } };
  } catch (error) {
    console.error(`[AccessPayment] ${feeType} start failure:`, error);
    return { success: false, error: error.message || "Could not start auction access payment." };
  }
}

export async function startBiddingFeePayment(auctionItemId) {
  return startAccessFeePayment(auctionItemId, "BIDDING_FEE");
}

/**
 * Step 2 — begin the SECURITY DEPOSIT payment (only after the bidding fee is PAID).
 */
export async function startSecurityDepositPayment(auctionItemId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (isNaN(cleanId)) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const [biddingFee] = await db.select().from(auctionAccessPayments).where(and(
      eq(auctionAccessPayments.userId, Number(session.user.id)),
      eq(auctionAccessPayments.auctionItemId, cleanId),
      eq(auctionAccessPayments.feeType, "BIDDING_FEE"),
    )).limit(1);

    if (!biddingFee || biddingFee.status !== "PAID") {
      return { success: false, error: "You must complete the bidding fee payment first." };
    }

    return startAccessFeePayment(cleanId, "SECURITY_DEPOSIT");
  } catch (error) {
    console.error("❌ Security deposit start failure:", error);
    return { success: false, error: error.message || "Could not start security deposit payment." };
  }
}

/**
 * Confirm an access payment by its PayChangu tx_ref.
 * Called after the gateway checkout returns; access is granted only when PayChangu verifies success.
 */
export async function confirmAuctionAccessPayment(auctionItemId, feeType, paymentRef) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    const normalizedType = feeType === "SECURITY_DEPOSIT"
      ? "SECURITY_DEPOSIT"
      : feeType === "BIDDING_FEE"
        ? "BIDDING_FEE"
        : null;

    if (!Number.isInteger(cleanId) || cleanId <= 0 || !normalizedType || typeof paymentRef !== "string" || !paymentRef.trim()) {
      return { success: false, error: "Invalid payment confirmation parameters." };
    }

    const userId = Number(session.user.id);
    const [accessPayment] = await db.select().from(auctionAccessPayments).where(and(
      eq(auctionAccessPayments.userId, userId),
      eq(auctionAccessPayments.auctionItemId, cleanId),
      eq(auctionAccessPayments.feeType, normalizedType),
      eq(auctionAccessPayments.paymentRef, paymentRef),
    )).limit(1);
    const [payment] = await db.select().from(payments)
      .where(eq(payments.reference, paymentRef))
      .limit(1);

    if (!accessPayment || !payment || payment.userId !== userId) {
      return { success: false, error: "Payment does not match this auction access request." };
    }
    if (Number(accessPayment.amount) !== Number(payment.amount)) {
      return { success: false, error: "Payment amount does not match the auction fee." };
    }
    if (payment.gatewayStatus.toLowerCase() === "completed" && accessPayment.status === "PAID") {
      return { success: true, data: { status: "PAID", feeType: normalizedType } };
    }

    if (!process.env.PAYCHANGU_SECRET_KEY) {
      return { success: false, error: "PayChangu verification is not configured. Auction access remains locked." };
    }

    // Payments complete asynchronously, so a PENDING gateway response is normal.
    let verified = null;
    let gatewayConfigured = Boolean(process.env.PAYCHANGU_SECRET_KEY);
    if (gatewayConfigured) {
      try {
        const verifyRes = await fetch(`https://api.paychangu.com/verify-payment/${encodeURIComponent(paymentRef)}`, {
          headers: {
            Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });
        if (!verifyRes.ok) {
          console.error("[AccessPayment] PayChangu verification failed with status:", verifyRes.status);
          throw new Error("PayChangu verification request failed.");
        }
        const verifyData = await verifyRes.json();
        const gatewayPayment = verifyData?.data;
        const gatewayReference = gatewayPayment?.tx_ref || gatewayPayment?.reference;
        if (
          (gatewayReference && gatewayReference !== paymentRef) ||
          (gatewayPayment?.amount != null && Number(gatewayPayment.amount) !== Number(accessPayment.amount))
        ) {
          verified = "invalid";
        } else {
          verified = String(gatewayPayment?.status || "").toLowerCase();
        }
      } catch (verifyErr) {
        console.error("[AccessPayment] verify error:", verifyErr);
      }
    }

    let effectiveStatus;
    if (verified === "success") {
      effectiveStatus = "PAID";
    } else if (verified === "failed") {
      effectiveStatus = "FAILED";
    } else {
      effectiveStatus = "PENDING";
    }

    const [record] = await db.update(auctionAccessPayments).set({
        status: effectiveStatus,
        paymentRef,
        paidAt: effectiveStatus === "PAID" ? new Date() : null,
      }).where(and(
        eq(auctionAccessPayments.userId, Number(session.user.id)),
        eq(auctionAccessPayments.auctionItemId, cleanId),
        eq(auctionAccessPayments.feeType, normalizedType),
        eq(auctionAccessPayments.paymentRef, paymentRef),
      )).returning();

    if (!record) {
      return { success: false, error: "Access payment record not found." };
    }

    if (effectiveStatus === "PENDING") {
      return { success: true, data: { status: record.status, feeType: record.feeType, needsVerification: true } };
    }

    await db.update(payments).set({
      gatewayStatus: effectiveStatus === "PAID" ? "completed" : effectiveStatus === "FAILED" ? "failed" : "pending",
    }).where(eq(payments.reference, paymentRef));

    if (effectiveStatus === "PAID") {
      try {
        await sendPaymentReceipt(paymentRef);
      } catch (receiptError) {
        console.error("[AccessPayment] Payment verified, but receipt email failed:", receiptError);
      }
    }

    return {
      success: true,
      data: {
        status: record.status,
        feeType: record.feeType,
        needsVerification: effectiveStatus === "PENDING",
      },
    };
  } catch (error) {
    console.error("❌ Access payment confirmation failure:", error);
    return { success: false, error: error.message || "Could not confirm the access payment." };
  }
}

/**
 * Check whether a bidder has cleared the full fee gate for an auction lot.
 */
export async function hasClearedAuctionGate(auctionItemId) {
  const status = await getAuctionAccessStatus(auctionItemId);
  if (!status.success) return { success: false, error: status.error };
  return { success: true, cleared: status.data.nextStep === "ACCESS_GRANTED", data: status.data };
}
