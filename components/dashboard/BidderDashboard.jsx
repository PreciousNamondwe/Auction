// /workspaces/Auction/e-auction/components/dashboard/BidderDashboard.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveLiveAuctions } from "@/app/actions/liveAuction";
import Pusher from "pusher-js";
import { Bell, Video, X, MapPin } from "lucide-react";

export default function BidderDashboard() {
  const router = useRouter();
  const [activeNotifications, setActiveNotifications] = useState([]);

  // Fetch pre-existing live sessions from Database + Bind Web Sockets
  useEffect(() => {
    async function syncActiveLots() {
      const res = await getActiveLiveAuctions();
      if (res.success && res.items.length > 0) {
        setActiveNotifications(res.items);
      }
    }
    
    // 1. Initial State DB catch-up execution
    syncActiveLots();

    // 2. Real-time Pusher stream synchronization setup
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    const channel = pusherClient.subscribe("global-notifications");

    channel.bind("new-live-lot", (data) => {
      // Append newly arriving live items to the tracking array without overwriting others
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

  const dismissNotification = (roomId) => {
    setActiveNotifications(prev => prev.filter(item => item.roomId !== roomId));
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white relative">
      <h1 className="text-xl font-bold">Available Auction Catalog</h1>
      <p className="text-sm text-slate-400 mt-1">Select an asset or wait for a live streaming feed call.</p>

      {/* Grid view wrapper context for active database listings */}
      <div className="mt-6 border border-dashed border-slate-800 rounded-2xl h-64 flex items-center justify-center text-slate-600 text-xs">
        General Platform Catalog View
      </div>

      {/* =========================================================
          STACKED HUD OVERLAY: HANDLES BACKLOGGED AND FRESH SESSIONS
          ========================================================= */}
      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full flex flex-col gap-4 pointer-events-none">
        {activeNotifications.map((notification) => (
          <div 
            key={notification.roomId} 
            className="w-full bg-slate-900 border border-indigo-500/40 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-5 duration-300"
          >
            {/* Asset Header Image */}
            <div className="relative h-24 w-full bg-slate-950 border-b border-slate-800">
              <img 
                src={notification.imageUrl} 
                alt={notification.itemTitle}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute top-2.5 left-2.5 bg-red-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white" /> Active Stream
              </div>
            </div>

            <div className="p-4 flex items-start gap-3 relative">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" /> Live Room Operational
                </h4>
                
                <h3 className="text-xs font-bold text-slate-100 mt-1 truncate">
                  {notification.itemTitle}
                </h3>

                <div className="mt-2 space-y-1 bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{notification.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 pt-0.5">
                    <span>Opening Value:</span>
                    <span>MWK {Number(notification.startingBid).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Router Link Dispatcher */}
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/auctions/live/${notification.roomId}?id=${notification.auctionItemId}`);
                    dismissNotification(notification.roomId);
                  }}
                  className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2 px-4 rounded-xl transition-all shadow-md shadow-indigo-900/30"
                >
                  Join Google Meet Floor
                </button>
              </div>

              <button 
                type="button"
                onClick={() => dismissNotification(notification.roomId)}
                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}