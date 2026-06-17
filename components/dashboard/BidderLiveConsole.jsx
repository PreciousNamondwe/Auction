"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveLiveAuctions, getLiveKitToken } from "@/app/actions/liveAuction";
import Pusher from "pusher-js";
import { 
  Bell, 
  Video, 
  X, 
  MapPin, 
  Loader2, 
  Tv, 
  Search, 
  Sparkles, 
  ArrowUpRight 
} from "lucide-react";

export default function BidderLiveConsole({ auctionItems = [] }) {
  const router = useRouter();
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [isJoiningId, setIsJoiningId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 📡 Sync Pre-existing live rooms from DB and establish Web Sockets connection
  useEffect(() => {
    async function syncActiveLots() {
      const res = await getActiveLiveAuctions();
      if (res.success && res.items?.length > 0) {
        setActiveNotifications(res.items);
      }
    }
    
    // 1. Initial State Database catching-up sequence
    syncActiveLots();

    // 2. Real-time Pusher stream routing mesh configuration
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    const channel = pusherClient.subscribe("global-notifications");

    channel.bind("new-live-lot", (data) => {
      // Append newly arriving live elements safely without wiping ongoing sessions
      setActiveNotifications((prev) => {
        const alreadyExists = prev.some(item => item.roomId === data.roomId);
        if (alreadyExists) return prev;
        return [data, ...prev];
      });
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe("global-notifications");
    };
  }, []);

  // 🔌 Safe Token Exchange & Connection Timeout Race Handler
  const handleJoinLiveRoom = async (notification) => {
    const targetRoomId = notification.roomId;
    const itemDbId = notification.auctionItemId || notification.id;

    try {
      setIsJoiningId(targetRoomId);

      // 1. Request client authentication keys with an 8-second promise racing layout
      const tokenPromise = getLiveKitToken(targetRoomId, itemDbId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signal timeout during handshake")), 8000)
      );

      const tokenPayload = await Promise.race([tokenPromise, timeoutPromise]);

      // 2. Clear out notification HUD state stack item and route to targeted live viewport
      setActiveNotifications(prev => prev.filter(item => item.roomId !== targetRoomId));
      router.push(`/auctions/live/${targetRoomId}?token=${tokenPayload.token}&id=${itemDbId}`);
    } catch (err) {
      console.error("Lobby Gateway Access Error Intercepted:", err);
      if (err.message.includes("Failed to fetch") || err.message.includes("signal connection") || err.message.includes("timeout")) {
        alert("⚠️ Signaling connection lost or timed out. Media stream handshaking failed. Re-syncing ports...");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        alert("Access rejected: " + err.message);
      }
    } finally {
      setIsJoiningId(null);
    }
  };

  const dismissNotification = (roomId) => {
    setActiveNotifications(prev => prev.filter(item => item.roomId !== roomId));
  };

  const filteredRooms = activeNotifications.filter(item => 
    item.itemTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.asset?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      
      {/* 🔮 PREMIUM PLATFORM STATS INSIGHT HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm md:text-base font-black tracking-tight flex items-center gap-1.5 text-slate-100">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Live Real Estate Market Floor
          </h2>
          <p className="text-[11px] text-indigo-200/80 max-w-xl leading-relaxed">
            Welcome to the open public floor. Connect directly to running auction streams, view properties via remote live feeds, and commit legal bindings in real-time.
          </p>
        </div>
        <div className="bg-indigo-950/60 border border-indigo-800/40 rounded-xl px-4 py-2.5 shrink-0 flex items-center gap-3 self-start sm:self-center">
          <div className="text-center">
            <span className="block text-xl font-black text-emerald-400 leading-none">{activeNotifications.length}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black mt-1 block">Live Rooms</span>
          </div>
        </div>
      </div>

      {/* 🔍 FILTER ENGINE */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input 
          type="text"
          placeholder="Search currently broadcasted room lots by title context..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* 📋 CENTRAL RECEPTACLE MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-700">Active Broadcasters ({filteredRooms.length})</h3>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-400 font-medium shadow-sm">
            {activeNotifications.length === 0 
              ? "There are no live real estate rooms broadcasting at this moment. You will hear an alert sound once an administrator boots up a camera lot stream." 
              : "No ongoing stream matches your search criteria filter."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((notification) => (
              <div 
                key={notification.roomId} 
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:border-indigo-200 transition-all"
              >
                {/* Image Placeholder Frame */}
                <div className="relative h-28 w-full bg-slate-900 border-b border-slate-100 overflow-hidden">
                  {notification.imageUrl ? (
                    <img 
                      src={notification.imageUrl} 
                      alt={notification.itemTitle}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-slate-600">
                      <Tv className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 bg-red-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1 shadow-sm">
                    <span className="w-1 h-1 rounded-full bg-white animate-ping" /> Feed Broadcasting
                  </div>
                </div>

                {/* Info Text Deck Block */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> Room Node Active
                    </h4>
                    <h3 className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {notification.itemTitle || notification.asset?.title || "Premium Asset Registry Lot"}
                    </h3>
                  </div>

                  {/* Metadata Registry Box */}
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{notification.location || "Malawi Regional Registry Location"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold border-t border-slate-200/60 pt-1 mt-1">
                      <span className="text-slate-400">Opening Floor:</span>
                      <span className="text-emerald-600 font-black">MWK {Number(notification.startingBid).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Router Trigger Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isJoiningId !== null}
                      onClick={() => handleJoinLiveRoom(notification)}
                      className="w-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-black text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      {isJoiningId === notification.roomId ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Token Passes...</>
                      ) : (
                        <><ArrowUpRight className="w-3.5 h-3.5" /> Connect to Live Room</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Dismiss X Cross Anchor */}
                <button 
                  type="button"
                  onClick={() => dismissNotification(notification.roomId)}
                  className="absolute top-2.5 right-2.5 bg-slate-900/40 backdrop-blur-sm p-1 rounded-full text-slate-200 hover:text-white hover:bg-slate-900/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================
          🔔 PERSISTENT FLOATING HUD OVERLAY TOAST 
          (Alerts bidders if they are on another tab like "Overview")
         ========================================================= */}
      {activeNotifications.length > 0 && (
        <div className="fixed bottom-20 right-4 z-[9999] max-w-xs w-full pointer-events-none md:bottom-6">
          {activeNotifications.slice(0, 1).map((notification) => (
            <div 
              key={`hud-${notification.roomId}`} 
              className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-5 duration-300 p-3.5 space-y-3 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg animate-pulse">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black tracking-wider uppercase text-slate-300">New Broadcast Started</span>
                </div>
                <button onClick={() => dismissNotification(notification.roomId)} className="text-slate-500 hover:text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-slate-100 truncate">{notification.itemTitle}</h3>
                <p className="text-[10px] text-emerald-400 font-bold mt-0.5">MWK {Number(notification.startingBid).toLocaleString()}</p>
              </div>

              <button
                type="button"
                disabled={isJoiningId !== null}
                onClick={() => handleJoinLiveRoom(notification)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                {isJoiningId === notification.roomId ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join Session Now"}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}