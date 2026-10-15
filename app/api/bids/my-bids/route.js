import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auctionSettlements, bids } from "@/lib/db/schema";
import { count, desc, eq, inArray } from "drizzle-orm";

/**
 * GET /api/bids/my-bids
 *
 * Returns all bids placed by the authenticated user,
 * including auction item details, asset info, images, and computed status.
 *
 * Query params:
 *   - status: filter by status (WINNING | OUTBID | ACTIVE | WON | LOST)
 *   - search: filter by asset title or category
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 20)
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

    // ── 2. PARSE QUERY PARAMS ────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const searchQuery = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    // ── 3. FETCH BIDS WITH RELATIONS ─────────────────────────────────
    const userBids = await db.query.bids.findMany({
      where: eq(bids.bidderId, userId),
      with: {
        auctionItem: {
          with: {
            asset: { columns: { id: true, title: true, category: true, description: true, location: true } },
            images: {
              where: (image, { eq }) => eq(image.isPrimary, true),
              limit: 1,
            },
          },
        },
      },
      orderBy: [desc(bids.createdAt)],
    });

    const auctionItemIds = [...new Set(userBids.map((bid) => bid.auctionItemId))];
    const [allCurrentBids, bidCounts] = auctionItemIds.length
      ? await Promise.all([
          db.select({ id: bids.id, auctionItemId: bids.auctionItemId, amount: bids.amount, bidderId: bids.bidderId })
            .from(bids).where(inArray(bids.auctionItemId, auctionItemIds))
            .orderBy(desc(bids.amount), desc(bids.createdAt), desc(bids.id)),
          db.select({ auctionItemId: bids.auctionItemId, total: count() }).from(bids)
            .where(inArray(bids.auctionItemId, auctionItemIds)).groupBy(bids.auctionItemId),
        ])
      : [[], []];
    const settlements = auctionItemIds.length
      ? await db.select({
          auctionItemId: auctionSettlements.auctionItemId,
          winnerId: auctionSettlements.winnerId,
        }).from(auctionSettlements).where(inArray(auctionSettlements.auctionItemId, auctionItemIds))
      : [];
    const settlementByAuction = new Map(settlements.map((settlement) => [settlement.auctionItemId, settlement]));
    const highestBids = new Map();
    for (const bid of allCurrentBids) {
      if (!highestBids.has(bid.auctionItemId)) highestBids.set(bid.auctionItemId, bid);
    }
    const bidCountByItem = new Map(bidCounts.map((row) => [row.auctionItemId, row.total]));

    // ── 4. ENRICH WITH COMPUTED STATUS & FILTER ───────────────────────
    const enrichedBids = await Promise.all(
      userBids.map((bid) => {
        const highestBid = highestBids.get(bid.auctionItemId);

        const now = new Date();
        const endTime = new Date(bid.auctionItem.endTime);
        const isAuctionClosed = endTime < now || bid.auctionItem.status === "CLOSED";

        // Compute status
        let status;
        if (isAuctionClosed) {
          const settlement = settlementByAuction.get(bid.auctionItemId);
          status = settlement
            ? settlement.winnerId === userId && highestBid?.id === bid.id ? "WON" : "LOST"
            : "PENDING";
        } else if (highestBid?.id === bid.id) {
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
          isWinningBid: bid.isWinningBid,
          status,
          auctionItem: {
            id: bid.auctionItem.id,
            reservePrice: bid.auctionItem.reservePrice,
            startingBid: bid.auctionItem.startingBid,
            depositAmount: bid.auctionItem.depositAmount,
            startTime: bid.auctionItem.startTime,
            endTime: bid.auctionItem.endTime,
            status: bid.auctionItem.status,
            liveRoomId: bid.auctionItem.liveRoomId,
            liveRoomId: bid.auctionItem.liveRoomId,
            currentPrice: highestBid?.amount || bid.amount,
            totalBids: bidCountByItem.get(bid.auctionItemId) || 0,
            asset: bid.auctionItem.asset,
            images: bid.auctionItem.images,
          },
        };
      })
    );

    // Apply status filter
    let filteredBids = enrichedBids;
    if (statusFilter !== "ALL") {
      filteredBids = enrichedBids.filter((b) => b.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredBids = filteredBids.filter(
        (b) =>
          b.auctionItem.asset.title.toLowerCase().includes(q) ||
          b.auctionItem.asset.category.toLowerCase().includes(q)
      );
    }

    // ── 5. PAGINATE ──────────────────────────────────────────────────
    const total = filteredBids.length;
    const paginatedBids = filteredBids.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    // ── 6. STATS ─────────────────────────────────────────────────────
    const stats = {
      totalBids: enrichedBids.length,
      winning: enrichedBids.filter((b) => b.status === "WINNING").length,
      outbid: enrichedBids.filter((b) => b.status === "OUTBID").length,
      won: enrichedBids.filter((b) => b.status === "WON").length,
      lost: enrichedBids.filter((b) => b.status === "LOST").length,
      active: enrichedBids.filter((b) => b.status === "ACTIVE").length,
    };

    // ── 7. RESPONSE ──────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: paginatedBids,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats,
    });

  } catch (error) {
    console.error("[GET /api/bids/my-bids] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}