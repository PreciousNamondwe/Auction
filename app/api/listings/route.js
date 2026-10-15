import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auctionItems, bids, dailySales } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

/**
 * GET /api/listings
 *
 * Auctioneer management feed with the two required columns:
 *  - dailySales: all daily sale commodity listings created by this auctioneer
 *  - properties: all property auction listings created by this auctioneer
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only auctioneers can manage listings." }, { status: 403 });
    }

    const userId = Number(session.user.id);

    const dailySaleRows = await db.query.dailySales.findMany({
      with: {
        asset: {
          with: {
            auctionItems: {
              with: { images: { where: (image, { eq }) => eq(image.isPrimary, true), limit: 1 } },
            },
          },
        },
      },
      orderBy: [desc(dailySales.createdAt)],
    });

    const properties = await db.query.auctionItems.findMany({
      with: {
        asset: true,
        images: { where: (image, { eq }) => eq(image.isPrimary, true), limit: 1 },
        bids: { orderBy: [desc(bids.amount)], limit: 1 },
      },
      orderBy: [desc(auctionItems.createdAt)],
    });

    return NextResponse.json({
      success: true,
      dailySales: dailySaleRows
        .filter((sale) => sale.asset?.createdById === userId)
        .map((sale) => ({
          id: sale.id,
          assetId: sale.asset.id,
          title: sale.asset.title,
          description: sale.asset.description,
          category: sale.asset.category,
          clientName: sale.asset.clientName || sale.asset.location,
          price: Number(sale.price),
          stockCount: sale.stockCount,
          isAvailable: sale.isAvailable,
          imageUrl: sale.asset.auctionItems?.[0]?.images?.[0]?.url || null,
          createdAt: sale.createdAt.toISOString(),
        })),
      properties: properties
        .filter((item) => item.asset?.createdById === userId)
        .map((item) => ({
          id: item.id,
          assetId: item.assetId,
          title: item.asset.title,
          description: item.asset.description,
          category: item.asset.category,
          clientName: item.asset.clientName || item.asset.location,
          listingType: item.asset.listingType || "AUCTION",
          askingPrice: item.asset.salePrice ? Number(item.asset.salePrice) : null,
          monthlyRent: item.asset.monthlyRent ? Number(item.asset.monthlyRent) : null,
          rentDueDay: item.asset.rentDueDay,
          startingBid: Number(item.startingBid),
          reservePrice: Number(item.reservePrice),
          entryFee: Number(item.depositAmount),
          biddingDeposit: Number(item.biddingFee),
          status: item.status,
          currentBid: item.bids[0] ? Number(item.bids[0].amount) : null,
          imageUrl: item.images[0]?.url || null,
          createdAt: item.createdAt.toISOString(),
        })),
    });
  } catch (error) {
    console.error("[Listings API]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load listings." },
      { status: 500 }
    );
  }
}
