"use client";

import { useState } from "react";
import { submitLiveBid } from "@/app/actions/liveAuction";
import { MessageSquare, Users, Coins, Tag, Gavel, ShieldAlert, Search, Volume2 } from "lucide-react";

export default function DeckSidebar({ room, bids, participants, auctionItemId, currentUserRole, initialError }) {
  const [activeTab, setActiveTab] = useState("bids");
  const [bidAmountInput, setBidAmountInput] = useState("");
  const [bidError, setBidError] = useState(initialError || "");
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  const handlePlaceBidSubmit = async (e) => {
    e.preventDefault();
    setBidError("");
    if (!bidAmountInput || isNaN(parseFloat(bidAmountInput))) {
      setBidError("Please input a valid numeric amount.");
      return;
    }

    try {
      setIsSubmittingBid(true);
      const res = await submitLiveBid(auctionItemId, bidAmountInput);
      if (res && res.success) {
        setBidAmountInput("");
        setBidError("");
      } else {
        setBidError(res?.error || "Failed to accept transaction requirements.");
      }
    } catch (err) {
      console.error("Client caught pipeline transaction breakdown:", err);
      setBidError(err.message || "Failed to process live bid action.");
    } finally {
      setIsSubmittingBid(false);
    }
  };

  return (
    <div className="flex-1 lg:flex-none lg:w-80 xl:w-96 bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl flex flex-col h-[45%] lg:h-full min-h-0 shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden shrink-0 z-30">
      
      {/* Tab Switcher Headers */}
      <div className="flex items-center justify-between p-3 border-b border-white/[0.05] shrink-0 bg-white/[0.01]">
        <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold ml-1">Room Deck</span>
        <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/[0.04]">
          <button 
            onClick={() => setActiveTab("bids")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "bids" ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.05]" : "text-purple-400 hover:text-purple-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Bids Log
          </button>
          
          <button 
            onClick={() => setActiveTab("people")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "people" ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.05]" : "text-purple-400 hover:text-purple-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Active ({participants.length})
          </button>
        </div>
      </div>

      {/* Dynamic Body Content Panel */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "bids" ? (
          <div className="flex-1 flex flex-col min-h-0 justify-between">
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Leaderboard Summary Banner */}
              <div className="p-4 mx-3 mt-3 bg-gradient-to-br from-white/[0.03] to-transparent rounded-xl border border-white/[0.05] flex items-center justify-between shadow-inner shrink-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Top Entry Amount
                  </span>
                  <span className="text-base font-bold text-white tracking-tight font-mono">
                    MWK {bids.length > 0 ? Number(bids[0].amount).toLocaleString() : "0.00"}
                  </span>
                </div>
                <div className="text-right flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Velocity</span>
                  <span className="text-xs font-bold text-purple-300 font-mono">{bids.length} placed</span>
                </div>
              </div>

              {/* Scrollable Items Stack */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none min-h-0">
                {bids.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-purple-500/40">
                    <Tag className="w-4 h-4 mb-2 opacity-50" />
                    <span className="text-xs">Waiting for room entries...</span>
                  </div>
                ) : (
                  bids.map((bid, idx) => (
                    <div key={bid.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {bid.bidderName ? bid.bidderName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium text-white truncate">{bid.bidderName}</p>
                          <p className="text-[9px] text-purple-400/60 font-medium tracking-wider uppercase">Verified Room Connection</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white font-mono shrink-0 pl-2">
                        MWK {Number(bid.amount).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Input Action Panel Lock Switch */}
            <div className="p-3 bg-black/30 border-t border-white/[0.05] shrink-0">
              {currentUserRole === "BIDDER" ? (
                <form onSubmit={handlePlaceBidSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-purple-500">
                        MWK
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={bidAmountInput}
                        onChange={(e) => setBidAmountInput(e.target.value)}
                        placeholder="Enter higher value amount..."
                        disabled={isSubmittingBid}
                        className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-14 pr-3 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-purple-500 focus:bg-white/[0.04] transition-all placeholder-purple-700/60 disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingBid}
                      className="px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(168,85,247,0.3)] border border-purple-500/20 shrink-0 disabled:opacity-50"
                    >
                      <Gavel className="w-3.5 h-3.5" /> Place
                    </button>
                  </div>
                  {bidError && (
                    <p className="text-[11px] font-medium text-rose-400 pl-1 animate-pulse">
                      ⚠️ {bidError}
                    </p>
                  )}
                </form>
              ) : (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white uppercase tracking-wide">Observer Mode Active</p>
                    <p className="text-[10px] text-purple-400/80 leading-relaxed">Your authorization tier restricts entry creation inside this asset lot slot.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-purple-500 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search identities..."
                  className="w-full pl-8 pr-4 py-1.5 bg-black/20 border border-white/[0.05] rounded-xl text-xs placeholder-purple-700 text-purple-100 focus:outline-none focus:border-white/[0.12] transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0 scrollbar-none">
              {participants.map((p, i) => {
                const isLocal = room && p.identity === room.localParticipant?.identity;
                return (
                  <div key={p.sid || i} className="p-2 rounded-xl flex items-center justify-between gap-3 hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.05] text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {p.name ? p.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-purple-100 truncate">
                          {p.name || p.identity} {isLocal && <span className="text-[9px] text-purple-400 font-bold ml-1 uppercase opacity-80">(You)</span>}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center shrink-0">
                      {p.isSpeaking ? (
                        <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center border border-purple-500/20 animate-pulse">
                          <Volume2 className="w-3 h-3 text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}