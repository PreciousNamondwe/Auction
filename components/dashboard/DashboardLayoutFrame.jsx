"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  LogOut, 
  Gavel,
  LayoutDashboard,
  Tv, 
  FolderGit, 
  Wallet,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck
} from "lucide-react";

// Component Registry Imports
import BidderDashboard from "@/components/dashboard/BidderDashboard";
import AuctioneerLiveConsole from "@/components/dashboard/AuctioneerLiveConsole";
import BidderLiveConsole from "@/components/dashboard/BidderLiveConsole";
import AuctioneerManageAssets from "@/components/dashboard/AuctioneerManageAssets";

export default function DashboardLayoutFrame({ user, serializedAuctionItems, isAuctioneer }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("live-console"); // Defaults to real-time interactions console
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  
  const dropdownRef = useRef(null);

  // Hook into incoming items list to continuously manage the floating tab badge indicators 
  useEffect(() => {
    if (serializedAuctionItems) {
      const activeRooms = serializedAuctionItems.filter(
        item => item.status === "LIVE" || item.status === "ACTIVE"
      );
      setLiveCount(activeRooms.length);
    }
  }, [serializedAuctionItems]);

  // Close the mobile profile dropdown menu automatically if user clicks on outside workspace area
  useEffect(() => {
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "OP";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans fixed inset-0 flex-col md:flex-row">
      
      {/* ========================================================
          DESKTOP SIDEBAR NAVIGATION (Hidden on Mobile screens)
         ======================================================== */}
      <aside 
        className={`hidden md:flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out relative shrink-0 z-50 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100 overflow-hidden shrink-0">
          <div className="flex aspect-square h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <Gavel className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900">Trust Terminal</span>
              <span className="text-[10px] text-slate-400 font-semibold">Operations v2.0</span>
            </div>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "dashboard" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Dashboard Overview</span>}
            </button>

            <button
              onClick={() => setActiveTab("live-console")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors relative ${
                activeTab === "live-console" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Tv className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <span className="truncate">
                  {isAuctioneer ? "Live Controller Console" : "Live Streaming Floor"}
                </span>
              )}
              {!isCollapsed && liveCount > 0 && (
                <span className="absolute right-3 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {liveCount}
                </span>
              )}
            </button>

            {isAuctioneer && (
              <button
                onClick={() => setActiveTab("manage-assets")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === "manage-assets" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <FolderGit className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Manage Assets Registry</span>}
              </button>
            )}

            <button
              onClick={() => setActiveTab("payments")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "payments" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Wallet className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Payments Ledger</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Fixed Base Operator profile Badge */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[11px] font-bold text-slate-800 truncate">{user?.name || "Operator"}</span>
                <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{user?.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Handle Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 text-slate-500 hover:text-slate-900 shadow-sm hidden md:block z-50 hover:bg-slate-50"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* ========================================================
          MAIN SYSTEM VIEWPORT CORE ENGINE
         ======================================================== */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden mb-16 md:mb-0">
        
        {/* GLOBAL SCREEN TOP APP BAR */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6 relative z-40">
          <div className="flex items-center gap-2">
            <div className="md:hidden flex aspect-square h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs md:text-sm font-bold text-slate-900 tracking-tight">Trust Terminal Platform</h1>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-semibold">Operations Center Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Dynamic Page View Tag Badge */}
            <span className="hidden md:inline-flex items-center text-[10px] bg-slate-100 font-bold px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 uppercase tracking-wider">
              {activeTab.replace("-", " ")}
            </span>

            {/* PERMANENT DESKTOP VIEW ACTION LOGOUT */}
            <div className="hidden md:block">
              <Link href="/api/auth/signout" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-white bg-slate-100 hover:bg-red-600 rounded-lg transition-all border border-slate-200 shadow-sm">
                <LogOut className="w-3 h-3" /> Log Out
              </Link>
            </div>

            {/* 🔴 MOBILE INTERACTIVE PROFILE AVATAR TRIGGER CIRCLE */}
            <div className="block md:hidden relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center border transition-all active:scale-95 focus:outline-none ${
                  isProfileDropdownOpen 
                    ? "bg-indigo-600 border-indigo-700 text-white ring-4 ring-indigo-100" 
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                }`}
              >
                {userInitials}
              </button>

              {/* 🔽 RESPONSIVE APP DROPDOWN OVERLAY PORTAL */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-[100] transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> Profile Info
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate mt-1">{user?.name || "System Operator"}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email || "No email assigned"}</p>
                  </div>
                  
                  <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Clearance: <span className="font-bold text-slate-900">{isAuctioneer ? "Auctioneer (Admin)" : "Verified Bidder"}</span>
                    </p>
                  </div>

                  <div className="px-2 pt-1.5 pb-0.5">
                    <Link 
                      href="/api/auth/signout" 
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg transition-colors border border-red-100 hover:border-red-600 shadow-sm"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Disconnect Session</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* DYNAMIC COMPONENT OVERLAY ROUTER ROUTING LOGIC */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-slate-50">
          <div className="mx-auto w-full max-w-7xl">
            
            {/* Overview / General Analytics Tab Panel */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {isAuctioneer ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <h2 className="text-sm font-bold text-slate-900">Operational Workspace Dashboard</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Welcome back administrator. Use your bottom console tray cards or sidebar tabs to launch property assets into the live WebRTC streaming floor pipeline.
                    </p>
                  </div>
                ) : (
                  <BidderDashboard />
                )}
              </div>
            )}

            {/* Live Operations Floor - Swaps display views natively based on session access role */}
            {activeTab === "live-console" && (
              isAuctioneer ? (
                <AuctioneerLiveConsole 
                  auctionItems={serializedAuctionItems} 
                  onItemsUpdate={(updated) => console.log("Broadcaster sync state: ", updated.length)}
                />
              ) : (
                <BidderLiveConsole auctionItems={serializedAuctionItems} />
              )
            )}

            {/* Asset Management System (Exclusively constrained to admin instances) */}
            {activeTab === "manage-assets" && isAuctioneer && (
              <AuctioneerManageAssets />
            )}

            {/* FinTech Escrow Verification Ledger */}
            {activeTab === "payments" && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900 mb-2">PayChangu Gateway Ledger</h2>
                <p className="text-xs text-slate-500 mb-4">Track non-refundable bidding fees, process automated refunds, and verify collateral security deposits.</p>
                <div className="p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-center text-xs text-slate-400 font-medium">
                  Bank Reference Reconciliation Node Listening.
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ========================================================
          MOBILE APPLICATION FLOATING BOTTOM APP NAVIGATION BAR (Sticky on Base)
         ======================================================== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 h-16 flex items-center justify-around px-2 z-50 shadow-lg">
        
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
            activeTab === "dashboard" ? "text-indigo-600 scale-105 font-bold" : "text-slate-500 font-medium"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("live-console")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all relative ${
            activeTab === "live-console" ? "text-indigo-600 scale-105 font-bold" : "text-slate-500 font-medium"
          }`}
        >
          <Tv className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">
            {isAuctioneer ? "Console" : "Live Floor"}
          </span>
          {liveCount > 0 && (
            <span className="absolute top-2.5 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {isAuctioneer && (
          <button
            onClick={() => setActiveTab("manage-assets")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
              activeTab === "manage-assets" ? "text-indigo-600 scale-105 font-bold" : "text-slate-500 font-medium"
            }`}
          >
            <FolderGit className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Assets</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
            activeTab === "payments" ? "text-indigo-600 scale-105 font-bold" : "text-slate-500 font-medium"
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Payments</span>
        </button>

      </div>

    </div>
  );
}