// app/dashboard/page.jsx
import { auth } from "../../auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User as UserIcon, Mail, Shield, ShieldCheck, LogOut, Gavel } from "lucide-react";
import AuctioneerDashboard from "@/components/dashboard/AuctioneerDashboard";
import BidderDashboard from "@/components/dashboard/BidderDashboard";

// Safe database connection instance for Turbopack hot reloading
import { prisma } from "@/lib/prisma"; 

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
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 🔥 HIGH-PRECISION SANITIZATION MATRIX FOR NEXT.JS 16 CLIENT BOUNDARIES
    // Explicitly forces all custom decimal instances to primitive types
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
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER BANNER */}
      <div className={`w-full p-6 text-white bg-gradient-to-r ${
        isAuctioneer 
          ? "from-indigo-600 to-slate-900" 
          : "from-blue-600 to-indigo-700"
      } shadow-md`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <Gavel className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Trust Auctioneers Terminal</h1>
              <p className="text-xs text-blue-100 mt-0.5">
                {isAuctioneer 
                  ? "Real Estate Listing Operations Desk" 
                  : "Bidder Asset Monitor Hub"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/api/auth/signout" className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase text-white bg-white/10 hover:bg-red-600 rounded-xl transition-all border border-white/10">
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SIDEBAR IDENTITY CARD PANEL */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-4 border-b pb-2">Identity Verification</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase">Account Name</label>
                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase">Email</label>
                  <p className="text-sm font-medium text-slate-600 break-all">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase">System Role</label>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-2xs font-bold uppercase mt-1 border ${
                    isAuctioneer 
                      ? "bg-purple-50 text-purple-700 border-purple-100" 
                      : "bg-blue-50 text-blue-700 border-blue-100"
                  }`}>
                    <ShieldCheck className="w-3 h-3" /> {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DYNAMIC DASHBOARD VIEW PORTAL */}
        <div className="lg:col-span-2 space-y-6">
          {isAuctioneer ? (
            <AuctioneerDashboard user={user} auctionItems={serializedAuctionItems} />
          ) : (
            <BidderDashboard />
          )}
        </div>
      </div>
    </div>
  );
}