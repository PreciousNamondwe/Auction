import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assets,
  auctionAccessPayments,
  auctionItems,
  auctionRefunds,
  auctionSettlements,
  bids,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

export async function notifyAuctionSettlement(auctionItemId) {
  const errors = [];
  const [settlement] = await db.select({
    id: auctionSettlements.id,
    winnerId: auctionSettlements.winnerId,
    winningBidAmount: auctionSettlements.winningBidAmount,
    winnerEmailSentAt: auctionSettlements.winnerEmailSentAt,
    reservePrice: auctionItems.reservePrice,
    title: assets.title,
  }).from(auctionSettlements)
    .innerJoin(auctionItems, eq(auctionSettlements.auctionItemId, auctionItems.id))
    .innerJoin(assets, eq(auctionItems.assetId, assets.id))
    .where(eq(auctionSettlements.auctionItemId, auctionItemId))
    .limit(1);
  if (!settlement) return { sent: 0, errors: ["Auction settlement record was not found."] };

  let sent = 0;
  if (settlement.winnerId && !settlement.winnerEmailSentAt) {
    const [winner] = await db.select({ name: users.name, email: users.email })
      .from(users).where(eq(users.id, settlement.winnerId)).limit(1);
    if (winner) {
      try {
        const [winnerRefund] = await db.select({ amount: auctionRefunds.amount })
          .from(auctionRefunds)
          .where(and(
            eq(auctionRefunds.auctionItemId, auctionItemId),
            eq(auctionRefunds.userId, settlement.winnerId),
          ))
          .limit(1);
        await sendEmail({
          to: winner.email,
          subject: `Auction result: ${settlement.title}`,
          text: `Hello ${winner.name},\n\nYou won "${settlement.title}" with a bid of MWK ${Number(settlement.winningBidAmount).toLocaleString()}.\n\n${winnerRefund
            ? `Your remaining bidding deposit of MWK ${Number(winnerRefund.amount).toLocaleString()} is in the administrator refund queue and will be returned through PayChangu after processing.`
            : "Your bidding deposit has been applied to your winning bid; there is no remaining deposit refund."}\n\nThank you,\nTrustBid`,
        });
        await db.update(auctionSettlements)
          .set({ winnerEmailSentAt: new Date() })
          .where(and(eq(auctionSettlements.id, settlement.id), isNull(auctionSettlements.winnerEmailSentAt)));
        sent += 1;
      } catch (error) {
        console.error("[Auction settlement winner email]", error);
        errors.push(`Winner email could not be sent to ${winner.email}.`);
      }
    }
  }

  const refundRows = await db.select({
    id: auctionRefunds.id,
    amount: auctionRefunds.amount,
    reason: auctionRefunds.reason,
    emailSentAt: auctionRefunds.emailSentAt,
    name: users.name,
    email: users.email,
    title: assets.title,
  }).from(auctionRefunds)
    .innerJoin(users, eq(auctionRefunds.userId, users.id))
    .innerJoin(auctionItems, eq(auctionRefunds.auctionItemId, auctionItems.id))
    .innerJoin(assets, eq(auctionItems.assetId, assets.id))
    .where(and(eq(auctionRefunds.auctionItemId, auctionItemId), isNull(auctionRefunds.emailSentAt)));

  for (const refund of refundRows) {
    try {
      await sendEmail({
        to: refund.email,
        subject: `Auction deposit refund pending: ${refund.title}`,
        text: `Hello ${refund.name},\n\nThe auction for "${refund.title}" has concluded. A refund of MWK ${Number(refund.amount).toLocaleString()} from your bidding deposit is queued for administrator processing through PayChangu. The refund has not yet been transferred.\n\nThank you,\nTrustBid`,
      });
      await db.update(auctionRefunds)
        .set({ emailSentAt: new Date() })
        .where(and(eq(auctionRefunds.id, refund.id), isNull(auctionRefunds.emailSentAt)));
      sent += 1;
    } catch (error) {
      console.error("[Auction settlement refund email]", error);
      errors.push(`Refund email could not be sent to ${refund.email}.`);
    }
  }
  return { sent, errors };
}

export async function settleAuction(auctionItemId) {
  const id = Number(auctionItemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid auction item ID.");

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT "id" FROM "auction_items" WHERE "id" = ${id} FOR UPDATE`);
    const [item] = await tx.select().from(auctionItems).where(eq(auctionItems.id, id)).limit(1);
    if (!item) throw new Error("Auction item not found.");

    const [existingSettlement] = await tx.select({ id: auctionSettlements.id })
      .from(auctionSettlements).where(eq(auctionSettlements.auctionItemId, id)).limit(1);
    if (existingSettlement) return { alreadySettled: true, refundCount: 0 };

    const auctionBids = await tx.select().from(bids)
      .where(eq(bids.auctionItemId, id))
      .orderBy(desc(bids.amount), desc(bids.createdAt));
    const highBid = auctionBids[0];
    const reserveMet = highBid && Number(highBid.amount) >= Number(item.reservePrice);
    const winnerId = reserveMet ? highBid.bidderId : null;
    const winningAmount = reserveMet ? Number(highBid.amount) : 0;

    const [createdSettlement] = await tx.insert(auctionSettlements).values({
      auctionItemId: id,
      winnerId,
      winningBidAmount: String(winningAmount),
    }).onConflictDoNothing({ target: auctionSettlements.auctionItemId }).returning({ id: auctionSettlements.id });
    if (!createdSettlement) return { alreadySettled: true, refundCount: 0 };

    await tx.update(auctionItems).set({ status: "CLOSED" }).where(eq(auctionItems.id, id));
    await tx.update(bids).set({ isWinningBid: false }).where(eq(bids.auctionItemId, id));
    if (winnerId) {
      await tx.update(bids).set({ isWinningBid: true }).where(and(
        eq(bids.auctionItemId, id),
        eq(bids.id, highBid.id),
      ));
      await tx.update(assets).set({ isSold: true }).where(eq(assets.id, item.assetId));
    }

    const paidDeposits = await tx.select().from(auctionAccessPayments).where(and(
      eq(auctionAccessPayments.auctionItemId, id),
      eq(auctionAccessPayments.feeType, "BIDDING_DEPOSIT"),
      eq(auctionAccessPayments.status, "PAID"),
    ));
    let refundCount = 0;
    for (const deposit of paidDeposits) {
      const isWinner = winnerId === deposit.userId;
      const amount = isWinner ? Math.max(0, Number(deposit.amount) - winningAmount) : Number(deposit.amount);
      if (amount <= 0) continue;
      await tx.insert(auctionRefunds).values({
        auctionItemId: id,
        accessPaymentId: deposit.id,
        userId: deposit.userId,
        amount: String(amount),
        reason: isWinner ? "WINNER_REMAINDER" : highBid && !reserveMet ? "RESERVE_NOT_MET" : "OUTBID",
      }).onConflictDoNothing({ target: auctionRefunds.accessPaymentId });
      refundCount += 1;
    }
    return { alreadySettled: false, refundCount };
  });

  const emailResult = await notifyAuctionSettlement(id);
  return { ...result, emailResult };
}
