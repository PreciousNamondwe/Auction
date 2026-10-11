"use client";

import React, { useState } from "react";
import { Loader2, LayoutGrid, ArrowRight, Hourglass, RotateCcw, Sparkles, Users, Power, Eye, CalendarPlus } from "lucide-react";
import { getLiveKitToken, updateAuctionToLiveDirectly, closeLiveAuctionDirectly } from "@/app/actions/liveAuction";
import { hasClearedAuctionGate } from "@/app/actions/auctionAccess";
import AuctionAccessGate from "@/components/dashboard/AuctionAccessGate";
import { useRouter } from "next/navigation";

export default function AuctioneerLiveConsole({ auctionItems = [], onItemsUpdate }) {
  const router = useRouter();
  
  const [itemsList, setItemsList] = useState(auctionItems);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [isReinitializing, setIsReinitializing] = useState(false);
  const [isInitializingId, setIsInitializingId] = useState(null); 
  const [isActionLoadingId, setIsActionLoadingId] = useState(null);
  const [gateAuction, setGateAuction] = useState(null);

  const enterLiveRoom = async (roomId, auctionItemId) => {
    const access = await hasClearedAuctionGate(auctionItemId);
    if (!access.success) throw new Error(access.error || "Could not verify auction access payments.");
    if (!access.cleared) {
      setGateAuction({ roomId, auctionItemId });
      return;
    }

    const tokenPayload = await getLiveKitToken(roomId, auctionItemId);
    if (!tokenPayload.success) throw new Error(tokenPayload.error || "Could not connect to the live auction.");
    router.push(`/auctions/live/${roomId}?token=${tokenPayload.token}&id=${auctionItemId}`);
  };

  const handleAccessGranted = async () => {
    if (!gateAuction) return;
    try {
      const tokenPayload = await getLiveKitToken(gateAuction.roomId, gateAuction.auctionItemId);
      if (!tokenPayload.success) throw new Error(tokenPayload.error || "Could not connect to the live auction.");
      router.push(`/auctions/live/${gateAuction.roomId}?token=${tokenPayload.token}&id=${gateAuction.auctionItemId}`);
    } catch (error) {
      alert(error.message || "Payments confirmed, but the room connection failed. Please try again.");
    }
  };

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
      const updateResult = await updateAuctionToLiveDirectly(itemId, computedRoomId);
      if (!updateResult?.success) {
        throw new Error(updateResult?.error || "Could not start this auction.");
      }

      const updated = itemsList.map(item => 
        item.id === Number(itemId) ? { ...item, status: "ACTIVE", liveRoomId: computedRoomId } : item
      );
      syncItemsList(updated);
      setSelectedInventoryId("");
      await enterLiveRoom(computedRoomId, Number(itemId));
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
      await enterLiveRoom(targetRoomId, Number(item.id));
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
      const result = await closeLiveAuctionDirectly(itemId);
      if (!result?.success) {
        throw new Error(result?.error || "Could not close this auction.");
      }
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
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text)]">Auctions</h2>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">Schedule an auction or manage your scheduled and live auctions.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/add-listing?mode=auction")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          <CalendarPlus className="h-4 w-4" /> Schedule Auction
        </button>
      </div>

      {gateAuction && (
        <AuctionAccessGate
          open
          onClose={() => setGateAuction(null)}
          auctionItemId={gateAuction.auctionItemId}
          roomId={gateAuction.roomId}
          onAccessGranted={handleAccessGranted}
        />
      )}
      
      {/* 🔄 RELAUNCH ENGINE CONTAINER */}
      <div className="bg-[var(--color-card)] text-[var(--color-text)] rounded-2xl p-4 md:p-5 border border-[var(--color-border)] shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
          <RotateCcw className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-xs font-black tracking-wider uppercase text-[var(--color-text)]">Live Relaunch Terminal</h3>
        </div>
        <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
          Select any closed asset to transition it back to <span className="text-emerald-400 font-bold">ACTIVE</span>.
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <select 
            value={selectedInventoryId} 
            onChange={(e) => setSelectedInventoryId(e.target.value)}
            className="w-full bg-[var(--color-input)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none"
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
            className="w-full md:w-auto px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            {isReinitializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Launch</>}
          </button>
        </div>
      </div>

      {/* 📋 CAMPAIGNS BLOCK */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[var(--color-muted)]" />
          <h3 className="text-xs font-black tracking-wider uppercase text-[var(--color-muted)]">Active Campaigns Block ({visibleActiveItems.length})</h3>
        </div>

        {visibleActiveItems.length === 0 ? (
          <div className="bg-[var(--color-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center text-xs text-[var(--color-muted)]">
            No active campaigns running right now. Use the terminal above to relaunch items.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleActiveItems.map((item) => {
              const isLive = item.status === "LIVE" || item.status === "ACTIVE";
              
              return (
                <div key={item.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-[var(--color-muted)] bg-[var(--color-input)] px-2 py-0.5 rounded-md">Lot #{item.id}</span>
                      {isLive ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                        </span>
                      ) : (
                        <span className="bg-[var(--color-secondary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text)] tracking-tight">{item.asset?.title || "Unnamed Property"}</h4>
                      <p className="text-xs text-[var(--color-muted)] line-clamp-2 mt-0.5">{item.asset?.description}</p>
                    </div>

                    <div className="text-[11px] font-medium text-[var(--color-muted)] grid grid-cols-1 gap-1 pt-1 border-t border-[var(--color-border)] mt-2">
                      <div>Starting Bid: <span className="font-bold text-[var(--color-text)]">MWK {Number(item.startingBid).toLocaleString()}</span></div>
                      <div>Reserve price: <span className="font-bold text-[var(--color-primary)]">MWK {Number(item.reservePrice).toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    {!isLive ? (
                      <button
                        type="button"
                        onClick={() => handleDirectLiveInitialization(item.id)}
                        disabled={isInitializingId !== null}
                        className="w-full text-center px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isInitializingId === item.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Starting...</>
                        ) : (
                          <><ArrowRight className="w-3.5 h-3.5" /> Start Live Bidding</>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2 w-full">
                        <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 w-full rounded-xl py-2 px-3 flex items-center justify-between border border-emerald-500/20">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 animate-pulse" /> Lobby Live</span>
                          <span className="text-[10px] text-[var(--color-muted)] font-medium">Bidders Live</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleWatchLiveRoom(item)}
                            disabled={isActionLoadingId !== null}
                            className="flex-1 text-center px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActionLoadingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Eye className="w-3.5 h-3.5" /> Enter</>}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleTerminateLiveSession(item.id)}
                            disabled={isActionLoadingId !== null}
                            className="flex-1 text-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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