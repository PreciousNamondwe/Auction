// app/actions/liveAuction.js
"use server";

import { AccessToken } from "livekit-server-sdk";
import { auth } from "../../auth";
import { db } from "@/lib/db";
import { auctionItems, bids } from "@/lib/db/schema";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import Pusher from "pusher";
import { hasClearedAuctionGate } from "@/app/actions/auctionAccess";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
  useTLS: true,
});

/**
 * 🚨 AUCTIONEER STAGE: Direct Live Launch Engine
 */
export async function approveAndStartLiveAuction(auctionItemId) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Authentication verification rejected." };
    }

    if (session.user.role !== "ADMIN") {
      return { success: false, error: "Access Denied: Only administrators can approve auction lots." };
    }

    const cleanId = Number(auctionItemId);
    if (!Number.isInteger(cleanId) || cleanId <= 0) {
      return { success: false, error: "Provided auction item ID is invalid." };
    }

    const itemDetails = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      with: {
        asset: true,
        images: { where: (image, { eq }) => eq(image.isPrimary, true), limit: 1 },
      },
    });
    if (!itemDetails) return { success: false, error: "Auction item not found." };
    if (itemDetails.asset?.listingType !== "AUCTION") {
      return { success: false, error: "Only auction listings can be approved for live bidding." };
    }
    if (itemDetails.startTime > new Date() || itemDetails.endTime <= new Date()) {
      return { success: false, error: "This auction can only be started during its scheduled time." };
    }

    const generatedRoomId = `room-lot-${cleanId}-${Date.now()}`;

    const [updatedItem] = await db.update(auctionItems).set({
        status: "ACTIVE",              
        liveRoomId: generatedRoomId,
      }).where(eq(auctionItems.id, cleanId)).returning();

    if (!updatedItem) return { success: false, error: "Auction item not found." };

    const primaryImageUrl = itemDetails.images[0]?.url || "/placeholder-property.jpg";

    const systemNotificationPayload = {
      id: String(Date.now()),
      auctionItemId: updatedItem.id,
      roomId: generatedRoomId,
      title: "🚨 Live Auction Approved & Open",
      itemTitle: itemDetails.asset?.title || "Unnamed Asset",
      description: itemDetails.asset?.description || "No asset description listed.",
      location: itemDetails.asset?.location || "N/A",
      category: itemDetails.asset?.category || "General",
      startingBid: Number(updatedItem.startingBid),
      depositAmount: Number(updatedItem.depositAmount),
      imageUrl: primaryImageUrl,
      createdAt: new Date().toISOString()
    };

    await pusher.trigger("global-notifications", "new-live-lot", systemNotificationPayload);

    return { success: true, roomId: generatedRoomId };
  } catch (error) {
    console.error("❌ Live Initialization Failure:", error);
    return { success: false, error: error.message || "Failed to approve broadcast instance." };
  }
}

/**
 * 🎫 ROOM TOKEN FACTORY
 */
export async function getLiveKitToken(roomId, auctionItemId) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Authentication rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (!Number.isInteger(cleanId) || cleanId <= 0 || typeof roomId !== "string" || !roomId.trim()) {
      return { success: false, error: "Invalid live auction room." };
    }

    const item = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      columns: { status: true, liveRoomId: true, startTime: true, endTime: true },
      with: { asset: { columns: { createdById: true, listingType: true } } },
    });
    if (!item || (item.status !== "ACTIVE" && item.status !== "LIVE")) {
      return { success: false, error: "This auction is not live." };
    }
    const now = new Date();
    if (item.startTime > now || item.endTime <= now) {
      return { success: false, error: "This auction is outside its scheduled live time." };
    }
    if (item.asset?.listingType !== "AUCTION") {
      return { success: false, error: "This listing is not an auction." };
    }
    if (
      (item.liveRoomId && item.liveRoomId !== roomId) ||
      (!item.liveRoomId && ![String(cleanId), `room-lot-${cleanId}-active`].includes(roomId))
    ) {
      return { success: false, error: "This room does not belong to the selected auction." };
    }

    const role = session.user.role || "BIDDER";
    const isOwner = role === "AUCTIONEER" && item.asset.createdById === Number(session.user.id);
    const canManageRoom = role === "ADMIN" || isOwner;
    if (!canManageRoom) {
      const access = await hasClearedAuctionGate(cleanId);
      if (!access.success) return { success: false, error: access.error };
      if (!access.cleared) {
        return { success: false, error: "Pay the bidding fee and security deposit before entering this auction." };
      }
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return { success: false, error: "Missing WebRTC infrastructure credentials." };
    }

    const participantIdentity = `${role.toLowerCase()}-${session.user.id}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: session.user.name || `${role} Member`,
    });

    if (canManageRoom) {
      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: false,   // No video/audio publishing needed
        canSubscribe: false, // No video/audio subscribing needed
        roomAdmin: true,    
      });
    } else {
      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: false,  // No video/audio
        canSubscribe: false, // No video/audio
      });
    }

    const token = await at.toJwt();
    return { success: true, token };
  } catch (error) {
    console.error("❌ Token Generation Failure:", error);
    return { success: false, error: "Failed to secure connection pass." };
  }
}

/**
 * 🔨 TRANSACTION MANAGEMENT
 */
export async function submitLiveBid(auctionItemId, amount) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Session expired or missing. Please log in again." };
    }

    if (session.user.role === "AUCTIONEER" || session.user.role === "ADMIN") {
      return { success: false, error: "Access Denied: Managers and Auctioneers can only monitor. You are blocked from bidding." };
    }

    const targetLotId = Number(auctionItemId);
    const incomingAmount = parseFloat(amount);

    if (isNaN(targetLotId)) {
      return { success: false, error: "Invalid layout configuration parameter: Lot item value cannot be read." };
    }
    if (isNaN(incomingAmount) || incomingAmount <= 0) {
      return { success: false, error: "The provided bid layout entry must contain a positive numerical value." };
    }

    const targetItem = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, targetLotId),
      with: { bids: { orderBy: [desc(bids.amount)], limit: 1 } },
    });

    if (!targetItem) {
      return { success: false, error: "Target inventory lot does not exist." };
    }

    if (targetItem.status !== "ACTIVE" && targetItem.status !== "LIVE") {
      return { success: false, error: `Bidding session is currently not accepting active offers. (Current Status: ${targetItem.status})` };
    }
    const now = new Date();
    if (targetItem.startTime > now || targetItem.endTime <= now) {
      return { success: false, error: "Bidding is only available during the scheduled auction time." };
    }

    const access = await hasClearedAuctionGate(targetLotId);
    if (!access.success) return { success: false, error: access.error };
    if (!access.cleared) {
      return { success: false, error: "Pay the bidding fee and security deposit before placing a bid." };
    }
    const maximumBid = Number(access.data.biddingDeposit);
    if (!Number.isFinite(maximumBid) || maximumBid <= 0) {
      return { success: false, error: "This auction has an invalid bidding-funds limit. Contact the auctioneer." };
    }
    if (incomingAmount > maximumBid) {
      return { success: false, error: `Bid cannot exceed your paid bidding deposit of MWK ${maximumBid.toLocaleString()}.` };
    }

    const highestBidValue = targetItem.bids[0]?.amount ? Number(targetItem.bids[0].amount) : Number(targetItem.startingBid);
    if (incomingAmount <= highestBidValue) {
      return { success: false, error: `Bid must exceed current high mark of MWK ${highestBidValue.toLocaleString()}.` };
    }

    const interpretedBidderId = isNaN(Number(session.user.id)) ? session.user.id : Number(session.user.id);

    const [placedBid] = await db.insert(bids).values({
        auctionItemId: targetLotId,
        bidderId: interpretedBidderId,
        amount: incomingAmount,
      }).returning();

    const broadcastPayload = {
      id: placedBid.id,
      amount: Number(placedBid.amount),
      bidderName: session.user.name || `Bidder #${session.user.id}`,
      createdAt: placedBid.createdAt.toISOString()
    };

    await pusher.trigger(`auction-room-${targetLotId}`, "new-bid", broadcastPayload);
    return { success: true, bid: broadcastPayload };
  } catch (error) {
    console.error("❌ Live Bid Processing Failure:", error);
    return { success: false, error: error.message || "An unexpected database operation exception was caught." };
  }
}

/**
 * 📦 GET FULL AUCTION ITEM DETAILS (for live room display)
 */
export async function getAuctionItemDetails(auctionItemId) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Authentication verification rejected." };
    }

    const cleanId = Number(auctionItemId);
    if (!Number.isInteger(cleanId) || cleanId <= 0) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const item = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      with: {
        asset: { with: { createdBy: { columns: { id: true, name: true, email: true } } } },
        images: true,
        bids: {
          orderBy: [desc(bids.amount)],
          with: { bidder: { columns: { id: true, name: true } } },
        },
        registrations: {
          where: (registration, { eq }) => eq(registration.status, "APPROVED"),
          columns: { id: true },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Auction item not found." };
    }
    if (item.asset?.listingType !== "AUCTION") {
      return { success: false, error: "This listing is not an auction." };
    }

    const isOwner = session.user.role === "AUCTIONEER" &&
      item.asset.createdById === Number(session.user.id);
    if (session.user.role !== "ADMIN" && !isOwner) {
      const access = await hasClearedAuctionGate(cleanId);
      if (!access.success) return { success: false, error: access.error };
      if (!access.cleared) {
        return { success: false, error: "Pay the bidding fee and security deposit before entering this auction." };
      }
    }

    // Format bids for frontend
    const formattedBids = item.bids.map(bid => ({
      id: bid.id,
      amount: Number(bid.amount),
      bidderId: bid.bidderId,
      bidderName: bid.bidder?.name || `Bidder #${bid.bidderId}`,
      createdAt: bid.createdAt.toISOString(),
      isWinningBid: bid.isWinningBid
    }));

    const highestBid = item.bids[0] ? Number(item.bids[0].amount) : Number(item.startingBid);

    return {
      success: true,
      data: {
        id: item.id,
        status: item.status,
        startingBid: Number(item.startingBid),
        reservePrice: Number(item.reservePrice),
        depositAmount: Number(item.depositAmount),
        maximumBid: Number(item.biddingFee),
        startTime: item.startTime.toISOString(),
        endTime: item.endTime.toISOString(),
        liveRoomId: item.liveRoomId,
        currentHighestBid: highestBid,
        participantCount: item.registrations.length + Math.floor(Math.random() * 5) + 3, // Base + variance
        asset: {
          id: item.asset.id,
          title: item.asset.title,
          description: item.asset.description,
          location: item.asset.location,
          category: item.asset.category,
          attributes: item.asset.attributes,
          documentUrl: item.asset.documentUrl,
          createdBy: item.asset.createdBy
        },
        images: item.images.map(img => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary
        })),
        bids: formattedBids
      }
    };
  } catch (error) {
    console.error("❌ Get Auction Item Details Failure:", error);
    return { success: false, error: error.message || "Failed to fetch auction item details." };
  }
}

/**
 * 📡 DATABASE CATCH-UP ENGINE
 */
export async function getActiveLiveAuctions() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, items: [], error: "Authentication verification rejected." };
    }

    const activeItems = await db.query.auctionItems.findMany({
      where: and(
        inArray(auctionItems.status, ["UPCOMING", "ACTIVE", "LIVE"]),
        gt(auctionItems.endTime, new Date()),
      ),
      with: {
        asset: true,
        images: {
          where: (image, { eq }) => eq(image.isPrimary, true),
          limit: 1,
        }
      }
    });

    return {
      success: true,
      items: activeItems
        .filter((item) => item.asset?.listingType === "AUCTION")
        .map(item => ({
        id: String(item.id),
        auctionItemId: item.id,
        roomId: item.liveRoomId,
        status: item.status,
        startTime: item.startTime.toISOString(),
        endTime: item.endTime.toISOString(),
        title: "🚨 Live Auction Approved & Open",
        itemTitle: item.asset?.title || "Unnamed Asset",
        description: item.asset?.description || "No asset description listed.",
        location: item.asset?.location || "N/A",
        category: item.asset?.category || "General",
        startingBid: Number(item.startingBid),
        depositAmount: Number(item.depositAmount),
        biddingFee: Number(item.biddingFee),
        imageUrl: item.images[0]?.url || "/placeholder-property.jpg",
        createdAt: item.updatedAt.toISOString()
      }))
        .sort((left, right) => {
          const leftUpcoming = left.status === "UPCOMING";
          const rightUpcoming = right.status === "UPCOMING";
          if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;
          const leftTime = leftUpcoming ? left.startTime : left.endTime;
          const rightTime = rightUpcoming ? right.startTime : right.endTime;
          return new Date(leftTime) - new Date(rightTime);
        })
    };
  } catch (error) {
    console.error("❌ Active Lot Catch-up Failure:", error);
    return { success: false, items: [], error: error.message };
  }
}

/**
 * 📡 DATABASE COUPLING HOOK: Turn Auction Item Status to ACTIVE
 */
export async function updateAuctionToLiveDirectly(itemId, computedRoomId) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized structural database update." };
    }

    const cleanId = Number(itemId);
    if (!Number.isInteger(cleanId) || cleanId <= 0 || typeof computedRoomId !== "string" || !computedRoomId.trim()) {
      return { success: false, error: "Invalid auction launch parameters." };
    }

    const item = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      columns: { id: true, startTime: true, endTime: true },
      with: { asset: { columns: { createdById: true, listingType: true } } },
    });
    if (!item) return { success: false, error: "Auction item not found." };
    if (item.asset?.listingType !== "AUCTION") {
      return { success: false, error: "Only auction listings can be launched." };
    }
    if (
      session.user.role !== "ADMIN" &&
      item.asset.createdById !== Number(session.user.id)
    ) {
      return { success: false, error: "You can only launch auctions that you created." };
    }
    const now = new Date();
    if (item.startTime > now || item.endTime <= now) {
      return { success: false, error: "This auction can only be started during its scheduled time." };
    }

    const [record] = await db.update(auctionItems).set({
        status: "ACTIVE", 
        liveRoomId: computedRoomId,
      }).where(eq(auctionItems.id, cleanId)).returning();

    if (!record) return { success: false, error: "Auction item not found." };

    return { success: true, data: JSON.parse(JSON.stringify(record)) };
  } catch (err) {
    console.error("❌ Status update failure:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 🛑 DATABASE COUPLING HOOK: Turn Auction Item Status to CLOSED
 */
export async function closeLiveAuctionDirectly(itemId) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized structural database update." };
    }

    const cleanId = Number(itemId);
    if (!Number.isInteger(cleanId) || cleanId <= 0) {
      return { success: false, error: "Invalid auction item ID." };
    }

    const item = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, cleanId),
      with: { asset: { columns: { createdById: true, listingType: true } } },
    });
    if (!item) return { success: false, error: "Auction item not found." };
    if (item.asset?.listingType !== "AUCTION") {
      return { success: false, error: "Only auction listings can be closed." };
    }
    if (
      session.user.role !== "ADMIN" &&
      item.asset.createdById !== Number(session.user.id)
    ) {
      return { success: false, error: "You can only close auctions that you created." };
    }

    const [record] = await db.update(auctionItems).set({ status: "CLOSED" })
      .where(eq(auctionItems.id, cleanId)).returning();

    if (!record) return { success: false, error: "Auction item not found." };

    return { success: true, data: JSON.parse(JSON.stringify(record)) };
  } catch (err) {
    console.error("❌ Status close failure:", err);
    return { success: false, error: err.message };
  }
}