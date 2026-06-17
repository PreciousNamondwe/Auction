"use client";

import React, { useState } from "react";
import { Loader2, LayoutGrid, ArrowRight, Hourglass, RotateCcw, Sparkles, Users, Power, Eye } from "lucide-react";
import { getLiveKitToken, updateAuctionToLiveDirectly, closeLiveAuctionDirectly } from "@/app/actions/liveAuction";
import { useRouter } from "next/navigation";

export default function AuctioneerLiveConsole({ auctionItems = [], onItemsUpdate }) {
  const router = useRouter();
  
  const [itemsList, setItemsList] = useState(auctionItems);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [isReinitializing, setIsReinitializing] = useState(false);
  const [isInitializingId, setIsInitializingId] = useState(null); 
  const [isActionLoadingId, setIsActionLoadingId] = useState(null);

  const syncItemsList = (updatedList) => {
    setItemsList(updatedList);
    if (onItemsUpdate) onItemsUpdate(updatedList);
  };

  const handleDirectLiveInitialization = async (itemId) => {
    if (!itemId) return;
    try {
      const isDropdownSelect = itemId === selectedInventoryId;
      if (isDropdownSelect) {
        setIsReinitializing(true);
      } else {
        setIsInitializingId(itemId);
      }
      
      const computedRoomId = `room-lot-${itemId}-${Date.now()}`;
      await updateAuctionToLiveDirectly(itemId, computedRoomId);
      
      const tokenPromise = getLiveKitToken(computedRoomId, itemId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signal timeout during WebRTC handshake")), 8000)
      );

      const tokenPayload = await Promise.race([tokenPromise, timeoutPromise]);
      alert(`⚡ Database status successfully set to ACTIVE for Lot #${itemId}! Routing to room viewport...`);
      
      const updated = itemsList.map(item => 
        item.id === Number(itemId) ? { ...item, status: "ACTIVE", liveRoomId: computedRoomId } : item
      );
      syncItemsList(updated);
      setSelectedInventoryId("");
      router.push(`/auctions/live/${computedRoomId}?token=${tokenPayload.token}&id=${itemId}`);
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("signal connection") || err.message.includes("timeout")) {
        alert("⚠️ Signaling connection lost or timed out. Refreshing workspace interface...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert("Database initialization rejected: " + err.message);
      }
    } finally {
      setIsReinitializing(false);
      setIsInitializingId(null);
    }
  };

  const handleWatchLiveRoom = async (item) => {
    try {
      setIsActionLoadingId(item.id);
      const targetRoomId = item.liveRoomId || `room-lot-${item.id}-active`;
      const tokenPromise = getLiveKitToken(targetRoomId, item.id);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Signal timeout")), 8000));

      const tokenPayload = await Promise.race([tokenPromise, timeoutPromise]);
      router.push(`/auctions/live/${targetRoomId}?token=${tokenPayload.token}&id=${item.id}`);
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("timeout")) {
        alert("🔌 Network Link Timeout. Performing interface recovery...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert("Could not pull connection pass token parameters: " + err.message);
      }
    } finally {
      setIsActionLoadingId(null);
    }
  };

  const handleTerminateLiveSession = async (itemId) => {
    const confirmation = confirm("Are you sure you want to end this live auction session?");
    if (!confirmation) return;
    try {
      setIsActionLoadingId(itemId);
      await closeLiveAuctionDirectly(itemId);
      const updated = itemsList.map(item => item.id === itemId ? { ...item, status: "CLOSED" } : item);
      syncItemsList(updated);
      alert(`🛑 Lot #${itemId} is now CLOSED.`);
    } catch (err) {
      alert("Failed to close remote instance block: " + err.message);
    } finally {
      setIsActionLoadingId(null);
    }
  };

  const visibleActiveItems = itemsList.filter(item => item.status !== "CLOSED");

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      
      {/* 🔄 RELAUNCH ENGINE CONTAINER */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-200">Live Relaunch Terminal</h3>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Select any closed asset to transition it back to <span className="text-emerald-400 font-bold">ACTIVE</span>.
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <select 
            value={selectedInventoryId} 
            onChange={(e) => setSelectedInventoryId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">-- Select Asset to Relaunch --</option>
            {itemsList.map((item) => (
              <option key={item.id} value={item.id}>
                Lot #{item.id} - {item.asset?.title || "No Title"} [{item.status || "SAVED"}]
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleDirectLiveInitialization(selectedInventoryId)}
            disabled={!selectedInventoryId || isReinitializing}
            className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            {isReinitializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Launch</>}
          </button>
        </div>
      </div>

      {/* 📋 CAMPAIGNS BLOCK */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-700">Active Campaigns Block ({visibleActiveItems.length})</h3>
        </div>

        {visibleActiveItems.length === 0 ? (
          <div className="bg-white border border-dashed rounded-2xl p-8 text-center text-xs text-slate-400">
            No active campaigns running right now. Use the terminal above to relaunch items.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleActiveItems.map((item) => {
              const isLive = item.status === "LIVE" || item.status === "ACTIVE";
              
              return (
                <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">Lot #{item.id}</span>
                      {isLive ? (
                        <span className="bg-red-50 text-red-600 border border-red-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{item.asset?.title || "Unnamed Property"}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.asset?.description}</p>
                    </div>

                    <div className="text-[11px] font-medium text-slate-600 grid grid-cols-1 gap-1 pt-1 border-t border-slate-50 mt-2">
                      <div>Starting Bid: <span className="font-bold text-slate-900">MWK {Number(item.startingBid).toLocaleString()}</span></div>
                      <div>Reserve price: <span className="font-bold text-amber-800">MWK {Number(item.reservePrice).toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    {!isLive ? (
                      <button
                        type="button"
                        onClick={() => handleDirectLiveInitialization(item.id)}
                        disabled={isInitializingId !== null}
                        className="w-full text-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:bg-slate-300"
                      >
                        {isInitializingId === item.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Starting...</>
                        ) : (
                          <><ArrowRight className="w-3.5 h-3.5" /> Start Live Bidding</>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2 w-full">
                        <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 w-full rounded-xl py-2 px-3 flex items-center justify-between border border-emerald-100">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 animate-pulse" /> Lobby Live</span>
                          <span className="text-[10px] text-slate-500 font-medium">Bidders Live</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleWatchLiveRoom(item)}
                            disabled={isActionLoadingId !== null}
                            className="flex-1 text-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:bg-slate-300"
                          >
                            {isActionLoadingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Eye className="w-3.5 h-3.5" /> Enter</>}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleTerminateLiveSession(item.id)}
                            disabled={isActionLoadingId !== null}
                            className="flex-1 text-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:bg-slate-300"
                          >
                            <Power className="w-3.5 h-3.5" /> End
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}