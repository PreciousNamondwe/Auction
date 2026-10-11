import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { assets, bids, dailySales } from "@/lib/db/schema";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

/**
 * GET /api/marketplace?tab=daily-sales|properties&q=search+term
 *
 * Bidder-facing marketplace feed:
 *  - tab=daily-sales  → regular sold commodities / goods (DAILY_SALE listings)
 *  - tab=properties   → land & buildings (PROPERTY listings), searchable by location
 *
 * Both tabs search across ALL auctioneers registered on the system.
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") === "properties" ? "properties" : "daily-sales";
    const q = (searchParams.get("q") || "").trim();
    const locationFilter = (searchParams.get("location") || "").trim();

    const searchFilter = q ? or(
      ilike(assets.title, `%${q}%`),
      ilike(assets.description, `%${q}%`),
      ilike(assets.category, `%${q}%`),
      ilike(assets.location, `%${q}%`),
    ) : undefined;

    // ── DAILY SALES: regular sold commodities (goods) across all auctioneers ──
    if (tab === "daily-sales") {
      const dailySaleRows = await db.query.dailySales.findMany({
        where: eq(dailySales.isAvailable, true),
        with: {
          asset: {
            with: {
              createdBy: { columns: { id: true, name: true, email: true } },
              auctionItems: {
                with: { images: { where: (image, { eq }) => eq(image.isPrimary, true), limit: 1 } },
              },
            },
          },
        },
        orderBy: [desc(dailySales.createdAt)],
      });

      const items = dailySaleRows
        .filter((sale) => sale.asset && !sale.asset.isSold && sale.asset.salesType === "DAILY_SALE")
        .filter((sale) => {
          if (!searchFilter) return true;
          const haystack = [
            sale.asset.title,
            sale.asset.description,
            sale.asset.category,
            sale.asset.location,
          ].join(" ").toLowerCase();
          return haystack.includes(q.toLowerCase());
        })
        .map((sale) => {
          const primaryImage =
            sale.asset.auctionItems?.flatMap((ai) => ai.images || [])[0]?.url || null;
          return {
            id: sale.id,
            assetId: sale.asset.id,
            title: sale.asset.title,
            description: sale.asset.description,
            category: sale.asset.category,
            clientName: sale.asset.clientName || sale.asset.location,
            price: Number(sale.price),
            attributes: sale.asset.attributes || {},
            imageUrl: primaryImage,
            auctioneerName: sale.asset.createdBy?.name || "Verified Auctioneer",
            auctioneerId: sale.asset.createdBy?.id || null,
            createdAt: sale.createdAt.toISOString(),
            kind: "DAILY_SALE",
          };
        });

      return NextResponse.json({ success: true, tab, count: items.length, items });
    }

    // ── PROPERTIES: sale and lease listings; auctions are shown on the auction floor ──
    const properties = await db.query.assets.findMany({
      where: and(
        eq(assets.isSold, false),
        eq(assets.salesType, "PROPERTY"),
        inArray(assets.listingType, ["SALE", "LEASE"]),
        ...(searchFilter ? [searchFilter] : []),
        ...(locationFilter ? [ilike(assets.location, `%${locationFilter}%`)] : []),
      ),
      with: {
        createdBy: { columns: { id: true, name: true, email: true } },
        auctionItems: {
          with: {
            images: { where: (image, { eq }) => eq(image.isPrimary, true), limit: 1 },
            bids: { orderBy: [desc(bids.amount)], limit: 1 },
          },
        },
      },
      orderBy: [desc(assets.createdAt)],
    });

    const items = properties.map((asset) => {
      const liveAuction =
        asset.auctionItems.find((ai) => ai.status === "ACTIVE" || ai.status === "UPCOMING") ||
        asset.auctionItems[0] ||
        null;

      return {
        id: asset.id,
      auctionItemId: asset.listingType === "AUCTION" ? liveAuction?.id || null : null,
        title: asset.title,
        description: asset.description,
        category: asset.category,
      clientName: asset.clientName || asset.location,
      listingType: asset.listingType || "AUCTION",
      askingPrice: asset.salePrice ? Number(asset.salePrice) : null,
      monthlyRent: asset.monthlyRent ? Number(asset.monthlyRent) : null,
      rentDueDay: asset.rentDueDay,
      startingBid: asset.listingType === "AUCTION" && liveAuction ? Number(liveAuction.startingBid) : null,
        currentBid: liveAuction?.bids?.[0] ? Number(liveAuction.bids[0].amount) : null,
        auctionStatus: liveAuction?.status || null,
        biddingFee: liveAuction ? Number(liveAuction.biddingFee) : 0,
        depositAmount: liveAuction ? Number(liveAuction.depositAmount) : 0,
        imageUrl: liveAuction?.images?.[0]?.url || null,
        attributes: asset.attributes || {},
        auctioneerName: asset.createdBy?.name || "Verified Auctioneer",
        auctioneerId: asset.createdBy?.id || null,
        createdAt: asset.createdAt.toISOString(),
        kind: "PROPERTY",
      };
    });

    return NextResponse.json({ success: true, tab, count: items.length, items });
  } catch (error) {
    console.error("[Marketplace API]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load marketplace listings." },
      { status: 500 }
    );
  }
}
