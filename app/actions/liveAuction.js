// app/actions/liveAuction.js
"use server";

import { AccessToken } from "livekit-server-sdk";
import { auth } from "../../auth";
import { prisma } from "@/lib/prisma"; 
import Pusher from "pusher";

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

    if (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN") {
      return { success: false, error: "Access Denied: Only certified auctioneers can spin up live lots." };
    }

    const cleanId = Number(auctionItemId);
    if (isNaN(cleanId)) {
      return { success: false, error: "Provided auction item ID is invalid." };
    }

    const generatedRoomId = `room-lot-${cleanId}-${Date.now()}`;

    const updatedItem = await prisma.auctionItem.update({
      where: { id: cleanId },
      data: { 
        status: "ACTIVE",              
        liveRoomId: generatedRoomId     
      },
      include: {
        asset: true,
        images: {
          where: { isPrimary: true },
          take: 1
        }
      }
    });

    const primaryImageUrl = updatedItem.images[0]?.url || "/placeholder-property.jpg";

    const systemNotificationPayload = {
      id: String(Date.now()),
      auctionItemId: updatedItem.id,
      roomId: generatedRoomId,
      title: "🚨 Live Auction Approved & Open",
      itemTitle: updatedItem.asset?.title || "Unnamed Asset",
      description: updatedItem.asset?.description || "No asset description listed.",
      location: updatedItem.asset?.location || "N/A",
      category: updatedItem.asset?.category || "General",
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

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return { success: false, error: "Missing WebRTC infrastructure credentials." };
    }

    const role = session.user.role || "BIDDER"; 
    const participantIdentity = `${role.toLowerCase()}-${session.user.id}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: session.user.name || `${role} Member`,
    });

    if (role === "AUCTIONEER" || role === "ADMIN") {
      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: true,   
        canSubscribe: true, 
        roomAdmin: true,    
      });
    } else {
      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: true,  
        canSubscribe: true,
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
 * 🔨 TRANSACTION MANAGEMENT (Fixed to protect from raw unhandled exceptions & ID casting errors)
 */
export async function submitLiveBid(auctionItemId, amount) {
  try {
    // 1. Session authentication verification check
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Session expired or missing. Please log in again." };
    }

    // 2. Clear out users with incorrect bidding clearance roles
    if (session.user.role === "AUCTIONEER" || session.user.role === "ADMIN") {
      return { success: false, error: "Access Denied: Managers and Auctioneers can only monitor. You are blocked from bidding." };
    }

    // 3. Fallback tracking logic for the database target format
    const targetLotId = Number(auctionItemId);
    const incomingAmount = parseFloat(amount);

    if (isNaN(targetLotId)) {
      return { success: false, error: "Invalid layout configuration parameter: Lot item value cannot be read." };
    }
    if (isNaN(incomingAmount) || incomingAmount <= 0) {
      return { success: false, error: "The provided bid layout entry must contain a positive numerical value." };
    }

    const targetItem = await prisma.auctionItem.findUnique({
      where: { id: targetLotId },
      include: {
        bids: { orderBy: { amount: "desc" }, take: 1 }
      }
    });

    if (!targetItem) {
      return { success: false, error: "Target inventory lot does not exist." };
    }

    if (targetItem.status !== "ACTIVE" && targetItem.status !== "LIVE") {
      return { success: false, error: `Bidding session is currently not accepting active offers. (Current Status: ${targetItem.status})` };
    }

    const highestBidValue = targetItem.bids[0]?.amount ? Number(targetItem.bids[0].amount) : Number(targetItem.startingBid);
    if (incomingAmount <= highestBidValue) {
      return { success: false, error: `Bid must exceed current high mark of MWK ${highestBidValue.toLocaleString()}.` };
    }

    // Adapt database user ID schema strategy safely (converts alpha string models vs integers seamlessly)
    const interpretedBidderId = isNaN(Number(session.user.id)) ? session.user.id : Number(session.user.id);

    const placedBid = await prisma.bid.create({
      data: {
        auctionItemId: targetLotId,
        bidderId: interpretedBidderId,
        amount: incomingAmount,
      }
    });

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
 * 📡 DATABASE CATCH-UP ENGINE
 */
export async function getActiveLiveAuctions() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, items: [], error: "Authentication verification rejected." };
    }

    const activeItems = await prisma.auctionItem.findMany({
      where: { status: "ACTIVE" },
      include: {
        asset: true,
        images: {
          where: { isPrimary: true },
          take: 1
        }
      }
    });

    return {
      success: true,
      items: activeItems.map(item => ({
        id: String(item.id),
        auctionItemId: item.id,
        roomId: item.liveRoomId,
        title: "🚨 Live Auction Approved & Open",
        itemTitle: item.asset?.title || "Unnamed Asset",
        description: item.asset?.description || "No asset description listed.",
        location: item.asset?.location || "N/A",
        category: item.asset?.category || "General",
        startingBid: Number(item.startingBid),
        depositAmount: Number(item.depositAmount),
        imageUrl: item.images[0]?.url || "/placeholder-property.jpg",
        createdAt: item.updatedAt.toISOString()
      }))
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

    const record = await prisma.auctionItem.update({
      where: { id: Number(itemId) },
      data: { 
        status: "ACTIVE", 
        liveRoomId: computedRoomId 
      },
    });
    
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

    const record = await prisma.auctionItem.update({
      where: { id: Number(itemId) },
      data: { 
        status: "CLOSED" 
      },
    });
    
    return { success: true, data: JSON.parse(JSON.stringify(record)) };
  } catch (err) {
    console.error("❌ Status close failure:", err);
    return { success: false, error: err.message };
  }
}