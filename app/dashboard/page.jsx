import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"; 
import DashboardLayoutFrame from "@/components/dashboard/DashboardLayoutFrame";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = {
    id: Number(session.user.id) || 0,
    name: session.user.name || "N/A",
    email: session.user.email || "",
    role: session.user.role || "BIDDER"
  };
  
  const isAuctioneer = user.role === "AUCTIONEER";
  let serializedAuctionItems = [];
  
  if (isAuctioneer) {
    const rawAuctionItems = await prisma.auctionItem.findMany({
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });

    serializedAuctionItems = rawAuctionItems.map((item) => ({
      id: Number(item.id),
      assetId: Number(item.assetId),
      reservePrice: item.reservePrice ? Number(item.reservePrice) : 0,
      startingBid: item.startingBid ? Number(item.startingBid) : 0,
      depositAmount: item.depositAmount ? Number(item.depositAmount) : 0,
      status: item.status || "UPCOMING",
      liveRoomId: item.liveRoomId || null,
      startTime: item.startTime ? item.startTime.toISOString() : null,
      endTime: item.endTime ? item.endTime.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      asset: item.asset ? {
        id: Number(item.asset.id),
        title: item.asset.title || "Unnamed Asset",
        description: item.asset.description || "",
        location: item.asset.location || "",
        category: item.asset.category || "OTHER",
        documentUrl: item.asset.documentUrl || null,
        createdAt: item.asset.createdAt.toISOString(),
        updatedAt: item.asset.updatedAt.toISOString(),
      } : null,
    }));
  }

  return (
    <DashboardLayoutFrame 
      user={user} 
      serializedAuctionItems={serializedAuctionItems} 
      isAuctioneer={isAuctioneer} 
    />
  );
}