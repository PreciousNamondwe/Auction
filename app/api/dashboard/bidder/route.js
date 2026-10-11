import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auctionItems, auctionRegistrations, bids, payments } from "@/lib/db/schema";
import { and, desc, eq, gt, inArray, asc } from "drizzle-orm";

/**
 * GET /api/dashboard/bidder
 *
 * Returns a comprehensive dashboard overview for the authenticated bidder,
 * including stats, recent bids, winning bids, upcoming auctions,
 * registrations, payments, and activity metrics.
 */
export async function GET(request) {
  try {
    // ── 1. AUTHENTICATION ──────────────────────────────────────────────
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);

    // ── 2. FETCH ALL BIDS WITH RELATIONS ─────────────────────────────
    const allBids = await db.query.bids.findMany({
      where: eq(bids.bidderId, userId),
      with: {
        auctionItem: {
          with: {
            asset: { columns: { id: true, title: true, category: true, location: true } },
            images: {
              where: (image, { eq }) => eq(image.isPrimary, true),
              limit: 1,
            },
          },
        },
      },
      orderBy: [desc(bids.createdAt)],
    });

    const auctionItemIds = [...new Set(allBids.map((bid) => bid.auctionItemId))];
    const [allCurrentBids] = auctionItemIds.length
      ? await Promise.all([
          db.select({ auctionItemId: bids.auctionItemId, amount: bids.amount, bidderId: bids.bidderId })
            .from(bids).where(inArray(bids.auctionItemId, auctionItemIds)).orderBy(desc(bids.amount)),
        ])
      : [[]];
    const highestBids = new Map();
    for (const bid of allCurrentBids) {
      if (!highestBids.has(bid.auctionItemId)) highestBids.set(bid.auctionItemId, bid);
    }

    // ── 3. ENRICH BIDS WITH COMPUTED STATUS ──────────────────────────
    const enrichedBids = await Promise.all(
      allBids.map((bid) => {
        const highestBid = highestBids.get(bid.auctionItemId);

        const now = new Date();
        const endTime = new Date(bid.auctionItem.endTime);
        const isAuctionClosed = endTime < now || bid.auctionItem.status === "CLOSED";

        let status;
        if (isAuctionClosed) {
          status = highestBid?.bidderId === userId ? "WON" : "LOST";
        } else if (highestBid?.bidderId === userId) {
          status = "WINNING";
        } else if (highestBid && Number(highestBid.amount) > Number(bid.amount)) {
          status = "OUTBID";
        } else {
          status = "ACTIVE";
        }

        return {
          id: bid.id,
          amount: bid.amount,
          createdAt: bid.createdAt,
          status,
          auctionItem: {
            id: bid.auctionItem.id,
            endTime: bid.auctionItem.endTime,
            status: bid.auctionItem.status,
            startingBid: bid.auctionItem.startingBid,
            currentPrice: highestBid?.amount || bid.amount,
            asset: bid.auctionItem.asset,
            images: bid.auctionItem.images,
          },
        };
      })
    );

    // ── 4. FETCH REGISTRATIONS ─────────────────────────────────────────
    const registrations = await db.query.auctionRegistrations.findMany({
      where: eq(auctionRegistrations.userId, userId),
      with: {
        auctionItem: {
          with: {
            asset: { columns: { id: true, title: true, category: true } },
            images: {
              where: (image, { eq }) => eq(image.isPrimary, true),
              limit: 1,
            },
          },
        },
      },
      orderBy: [desc(auctionRegistrations.createdAt)],
      limit: 5,
    });

    const enrichedRegistrations = registrations.map((reg) => ({
      id: reg.id,
      status: reg.status,
      createdAt: reg.createdAt,
      auctionItem: {
        id: reg.auctionItem.id,
        endTime: reg.auctionItem.endTime,
        status: reg.auctionItem.status,
        asset: reg.auctionItem.asset,
        images: reg.auctionItem.images,
      },
    }));

    // ── 5. FETCH PAYMENTS ────────────────────────────────────────────
    const recentPayments = await db.select().from(payments).where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt)).limit(5);

    // ── 6. FETCH UPCOMING AUCTIONS ───────────────────────────────────
    const now = new Date();
    const upcomingAuctions = await db.query.auctionItems.findMany({
      where: and(eq(auctionItems.status, "UPCOMING"), gt(auctionItems.startTime, now)),
      with: {
        asset: {
          columns: { id: true, title: true, category: true, location: true },
        },
        images: {
          where: (image, { eq }) => eq(image.isPrimary, true),
          limit: 1,
        },
      },
      orderBy: [asc(auctionItems.startTime)],
      limit: 6,
    });

    // ── 7. COMPUTE STATS ───────────────────────────────────────────────
    const totalBids = enrichedBids.length;
    const winningBids = enrichedBids.filter((b) => b.status === "WINNING");
    const outbidCount = enrichedBids.filter((b) => b.status === "OUTBID").length;
    const auctionsWon = enrichedBids.filter((b) => b.status === "WON").length;
    const totalSpent = recentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPayments = recentPayments.length;
    const successfulPayments = recentPayments.filter(
      (p) => p.gatewayStatus === "SUCCESS" || p.gatewayStatus === "COMPLETED"
    ).length;
    const totalRegistrations = registrations.length;
    const approvedRegistrations = registrations.filter((r) => r.status === "APPROVED").length;
    const activeRegistrations = registrations.filter(
      (r) => r.status === "APPROVED" && new Date(r.auctionItem.endTime) > now
    ).length;

    // ── 8. BUILD RESPONSE ──────────────────────────────────────────────
    const dashboardData = {
      stats: {
        totalBids,
        winningBids: winningBids.length,
        outbidCount,
        auctionsWon,
        totalSpent,
        totalPayments,
        successfulPayments,
        totalRegistrations,
        approvedRegistrations,
        activeRegistrations,
        upcomingAuctions: upcomingAuctions.length,
        bidsTrend: totalBids > 5 ? 12 : totalBids > 0 ? 5 : 0, // placeholder trend
      },
      recentBids: enrichedBids.slice(0, 5),
      winningBids: winningBids.slice(0, 4),
      upcomingAuctions,
      registeredAuctions: enrichedRegistrations,
      recentPayments,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error("[GET /api/dashboard/bidder] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}