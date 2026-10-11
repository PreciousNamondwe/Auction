"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers";
import { confirmAuctionAccessPayment, hasClearedAuctionGate } from "@/app/actions/auctionAccess";
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
  ShieldCheck,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  ShoppingBag,
  Home
} from "lucide-react";

// Component Registry Imports
import BidderDashboard from "@/components/dashboard/BidderDashboard";
import AuctioneerLiveConsole from "@/components/dashboard/AuctioneerLiveConsole";
import BidderLiveConsole from "@/components/dashboard/BidderLiveConsole";
import AuctioneerManageAssets from "@/components/dashboard/AuctioneerManageAssets";
import AuctioneerAddListing from "@/components/dashboard/AuctioneerAddListing";
import BidderMarketplace from "@/components/dashboard/BidderMarketplace";
import PaymentHistory from "@/components/dashboard/PaymentHistory";
import AuctioneerFinance from "@/components/dashboard/AuctioneerFinance";
import Mybids from "./Mybids"

export default function DashboardLayoutFrame({ user, serializedAuctionItems, isAuctioneer, forceTab = null, addListingInitialMode = "property" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(forceTab || searchParams.get("tab") || "live-auctions");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [liveCountState, setLiveCountState] = useState(0);
  const [accessPaymentMessage, setAccessPaymentMessage] = useState("");
  const { theme, toggleTheme } = useTheme();

  const dropdownRef = useRef(null);
  const handledPaymentReturn = useRef("");
  const returnedPaymentRef = searchParams.get("access_payment_ref");
  const returnedAuctionId = searchParams.get("access_auction_id");
  const returnedFeeType = searchParams.get("access_fee_type");
  const returnedRoomId = searchParams.get("access_room_id");

  // Derive live count from serializedAuctionItems to avoid synchronous setState in effects.
  // Keep a state fallback for compatibility, but prefer memoized derived value.
  const liveCount = React.useMemo(() => {
    if (!serializedAuctionItems) return 0;
    return serializedAuctionItems.filter(
      (item) => item.status === "LIVE" || item.status === "ACTIVE"
    ).length;
  }, [serializedAuctionItems]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (
      !returnedPaymentRef ||
      !returnedAuctionId ||
      !["ENTRY_FEE", "BIDDING_DEPOSIT", "BIDDING_FEE", "SECURITY_DEPOSIT"].includes(returnedFeeType) ||
      !["BIDDER", "AUCTIONEER"].includes(user?.role)
    ) return;

    const returnKey = `${returnedPaymentRef}:${returnedAuctionId}:${returnedFeeType}`;
    if (handledPaymentReturn.current === returnKey) return;
    handledPaymentReturn.current = returnKey;
    let isCurrent = true;

    async function verifyReturnedPayment() {
      try {
        const result = await confirmAuctionAccessPayment(returnedAuctionId, returnedFeeType, returnedPaymentRef);
        if (!isCurrent) return;
        if (!result.success) {
          setAccessPaymentMessage(`Payment verification failed: ${result.error}`);
        } else if (result.data?.status === "PAID") {
          const access = await hasClearedAuctionGate(returnedAuctionId);
          if (access.success && access.cleared && returnedRoomId) {
            router.replace(`/auctions/live/${encodeURIComponent(returnedRoomId)}?id=${encodeURIComponent(returnedAuctionId)}`);
            return;
          }
          setAccessPaymentMessage(
            access.success && !access.cleared
              ? "Payment confirmed. Complete any remaining access payment to enter the auction."
              : "Payment confirmed. You can now join the live auction."
          );
        } else if (result.data?.status === "FAILED") {
          setAccessPaymentMessage("PayChangu reported that the payment failed. Please try again.");
        } else {
          setAccessPaymentMessage("Payment is still processing. Rejoin the auction to check again.");
        }
      } catch (error) {
        if (isCurrent) {
          console.error("[Auction access return]", error);
          setAccessPaymentMessage("Could not verify the payment. Rejoin the auction to check again.");
        }
      } finally {
        if (isCurrent) router.replace("/dashboard?tab=live-auctions");
      }
    }
    verifyReturnedPayment();

    return () => {
      isCurrent = false;
    };
  }, [returnedPaymentRef, returnedAuctionId, returnedFeeType, returnedRoomId, user?.role, router]);

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "OP";

  const getTabLabel = (tab) => {
    const labels = {
      "dashboard": "Dashboard",
      "live-auctions": isAuctioneer ? "Auctions" : "Live Auction Floor",
      "daily-sales": "Daily Sales",
      "properties": "Properties",
      "my-bids": "My Bids",
      "manage-listings": "Manage Listings",
      "add-listing": "Add Listing",
      "payments": isAuctioneer ? "Payments Received" : "Receipts",
      "reports": "Reports",
      "settings": "Settings"
    };
    return labels[tab] || tab;
  };

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", show: true },
    { id: "live-auctions", icon: Tv, label: isAuctioneer ? "Auctions" : "Live Auction Floor", show: true, badge: liveCount },
    { id: "daily-sales", icon: ShoppingBag, label: "Daily Sales", show: !isAuctioneer },
    { id: "properties", icon: Home, label: "Properties", show: !isAuctioneer },
    { id: "my-bids", icon: Gavel, label: "My Bids", show: !isAuctioneer },
    { id: "manage-listings", icon: FolderGit, label: "Manage Listings", show: isAuctioneer },
    { id: "payments", icon: Wallet, label: isAuctioneer ? "Payments Received" : "Receipts", show: true },
    { id: "reports", icon: BarChart3, label: "Reports", show: isAuctioneer },
    { id: "settings", icon: Settings, label: "Settings", show: true },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] font-sans fixed inset-0 flex-col md:flex-row">

      {/* ========================================================
          DESKTOP SIDEBAR NAVIGATION
         ======================================================== */}
      <aside 
        className={`hidden md:flex flex-col h-full bg-[var(--color-card)] border-r border-[var(--color-border)] transition-all duration-300 ease-in-out relative shrink-0 z-50 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[var(--color-border)] overflow-hidden shrink-0">
          <div className="flex aspect-square h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/20">
            <Gavel className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-bold text-xs uppercase tracking-tight text-[var(--color-text)]">TrustBid</span>
              <span className="text-[10px] text-[var(--color-muted)] font-semibold">Auction Platform</span>
            </div>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <nav className="space-y-1">
            {navItems.filter(item => item.show).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 relative group ${
                  activeTab === item.id 
                    ? "bg-[var(--color-secondary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/20" 
                    : "text-[var(--color-muted)] hover:bg-[var(--color-input)] hover:text-[var(--color-text)]"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-colors ${activeTab === item.id ? "text-[var(--color-primary)]" : "text-[var(--color-muted)] group-hover:text-[var(--color-text)]"}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {!isCollapsed && item.badge > 0 && (
                  <span className="absolute right-3 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Profile Badge */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-input)]/30 shrink-0">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--color-input)] p-1.5 overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-[var(--color-bg)] flex items-center justify-center font-black text-xs shrink-0">
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[11px] font-bold text-[var(--color-text)] truncate">{user?.name || "User"}</span>
                <span className="text-[9px] text-[var(--color-muted)] truncate max-w-[120px]">{user?.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-[var(--color-card)] border border-[var(--color-border)] rounded-full p-1.5 text-[var(--color-muted)] hover:text-[var(--color-primary)] shadow-lg hidden md:block z-50 hover:bg-[var(--color-input)] transition-all duration-300 hover:scale-110"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* ========================================================
          MAIN VIEWPORT
         ======================================================== */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden mb-16 md:mb-0">

        {/* TOP APP BAR */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 md:px-6 relative z-40">
          <div className="flex items-center gap-3 flex-1">
            <div className="md:hidden flex aspect-square h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] text-white shadow-sm">
              <Gavel className="w-4 h-4" />
            </div>

          </div>

          <div className="flex items-center gap-3">
            {/* Active Tab Badge */}
            <span className="hidden md:inline-flex items-center text-[10px] bg-[var(--color-input)] font-bold px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-primary)] uppercase tracking-wider">
              {getTabLabel(activeTab)}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="w-9 h-9 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all duration-300"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <button className="relative w-9 h-9 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all duration-300">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse" />
            </button>

            {/* Desktop Logout */}
            <div className="hidden md:block">
              <Link href="/api/auth/signout" className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] hover:text-white bg-[var(--color-input)] hover:bg-red-500/80 rounded-xl transition-all border border-[var(--color-border)] hover:border-red-500/50 shadow-sm">
                <LogOut className="w-3 h-3" /> Exit
              </Link>
            </div>

            {/* Mobile Profile Avatar */}
            <div className="block md:hidden relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center border-2 transition-all active:scale-95 focus:outline-none ${
                  isProfileDropdownOpen 
                    ? "bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-bg)] ring-4 ring-[var(--color-primary)]/20" 
                    : "bg-[var(--color-input)] hover:bg-[var(--color-border)] border-[var(--color-border)] text-[var(--color-text)]"
                }`}
              >
                {userInitials}
              </button>

              {/* Mobile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/20 py-3 z-[100] transform origin-top-right">
                  <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5 mb-2">
                      <User className="w-3 h-3" /> Profile Info
                    </p>
                    <p className="text-sm font-bold text-[var(--color-text)] truncate">{user?.name || "User"}</p>
                    <p className="text-[10px] text-[var(--color-muted)] truncate">{user?.email || "No email"}</p>
                  </div>

                  <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-input)]/30">
                    <p className="text-[10px] font-semibold text-[var(--color-muted)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Role: <span className="font-bold text-[var(--color-text)]">{isAuctioneer ? "Auctioneer" : "Bidder"}</span>
                    </p>
                  </div>

                  <div className="px-3 pt-2 pb-1">
                    <Link 
                      href="/api/auth/signout" 
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-xl transition-all border border-red-500/20 hover:border-red-500"
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

        {/* DYNAMIC CONTENT ROUTER */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-[var(--color-bg)]">
          <div className="mx-auto w-full max-w-7xl">
            {accessPaymentMessage && (
              <p className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-text)]" role="status">
                {accessPaymentMessage}
              </p>
            )}

            {/* Dashboard Overview */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {isAuctioneer ? (
                  <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)]">Auctioneer Dashboard</h2>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                          Manage listings, monitor live bids, and track payments
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all group">
                        <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Active Listings</p>
                        <p className="text-3xl font-extrabold text-[var(--color-primary)] group-hover:scale-105 transition-transform">{liveCount}</p>
                        <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '65%' }} />
                        </div>
                      </div>
                      <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all group">
                        <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Total Bids</p>
                        <p className="text-3xl font-extrabold text-[var(--color-primary)] group-hover:scale-105 transition-transform">1,240</p>
                        <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-[var(--color-secondary)] rounded-full" style={{ width: '82%' }} />
                        </div>
                      </div>
                      <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all group">
                        <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Revenue</p>
                        <p className="text-3xl font-extrabold text-[var(--color-primary)] group-hover:scale-105 transition-transform">MK 45M</p>
                        <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '45%' }} />
                        </div>
                      </div>
                      <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all group">
                        <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Success Rate</p>
                        <p className="text-3xl font-extrabold text-[var(--color-primary)] group-hover:scale-105 transition-transform">98%</p>
                        <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-[var(--color-secondary)] rounded-full" style={{ width: '98%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <BidderDashboard />
                )}
              </div>
            )}

            {/* Manage Auctions (Auctioneer) / Live Auction Floor (Bidder) */}
            {activeTab === "live-auctions" && (
              isAuctioneer ? (
                <AuctioneerLiveConsole 
                  auctionItems={serializedAuctionItems} 
                  onItemsUpdate={(updated) => console.log("Broadcaster sync: ", updated.length)}
                />
              ) : (
                <BidderLiveConsole auctionItems={serializedAuctionItems} />
              )
            )}

            {/* Daily Sales (Bidder) — regular sold commodities with search */}
            {activeTab === "daily-sales" && !isAuctioneer && (
              <BidderMarketplace initialTab="daily-sales" />
            )}

            {/* Properties (Bidder) — land & buildings searchable by location */}
            {activeTab === "properties" && !isAuctioneer && (
              <BidderMarketplace initialTab="properties" />
            )}

            {/* My Bids (Bidder only) */}
            {activeTab === "my-bids" && !isAuctioneer && (
              <Mybids/>
            )}

            {/* Manage Listings (Auctioneer only) */}
            {activeTab === "manage-listings" && isAuctioneer && (
              <AuctioneerManageAssets />
            )}

            {/* Add Listing form (redirect target of the Add Listing button) */}
            {activeTab === "add-listing" && isAuctioneer && (
              <AuctioneerAddListing initialMode={addListingInitialMode} />
            )}

            {/* Payments received / bidder receipts */}
            {activeTab === "payments" && (
              isAuctioneer
                ? <AuctioneerFinance view="payments" />
                : <PaymentHistory role={user?.role} />
            )}

            {activeTab === "reports" && isAuctioneer && (
              <AuctioneerFinance view="reports" />
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">Account Settings</h2>
                    <p className="text-xs text-[var(--color-muted)]">Manage profile, notifications, and security</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-secondary)]/20 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Email Notifications</p>
                        <p className="text-[10px] text-[var(--color-muted)]">Bid updates and auction alerts</p>
                      </div>
                    </div>
                    <div className="w-11 h-6 bg-[var(--color-secondary)] rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-input)] flex items-center justify-center border border-[var(--color-border)]">
                        <ShieldCheck className="w-4 h-4 text-[var(--color-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Two-Factor Authentication</p>
                        <p className="text-[10px] text-[var(--color-muted)]">Secure your account with 2FA</p>
                      </div>
                    </div>
                    <div className="w-11 h-6 bg-[var(--color-input)] border border-[var(--color-border)] rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-[var(--color-muted)] rounded-full shadow-sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-input)] flex items-center justify-center border border-[var(--color-border)]">
                        <User className="w-4 h-4 text-[var(--color-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Public Profile</p>
                        <p className="text-[10px] text-[var(--color-muted)]">Make your profile visible to others</p>
                      </div>
                    </div>
                    <div className="w-11 h-6 bg-[var(--color-secondary)] rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION
         ======================================================== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--color-card)]/95 backdrop-blur-md border-t border-[var(--color-border)] h-16 flex items-center justify-around px-2 z-50 shadow-lg shadow-black/20">

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
            activeTab === "dashboard" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("live-auctions")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all relative ${
            activeTab === "live-auctions" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
          }`}
        >
          <Tv className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">
            {isAuctioneer ? "Manage" : "Bids"}
          </span>
          {liveCount > 0 && (
            <span className="absolute top-2.5 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {!isAuctioneer && (
          <button
            onClick={() => setActiveTab("daily-sales")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
              activeTab === "daily-sales" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Daily</span>
          </button>
        )}

        {!isAuctioneer && (
          <button
            onClick={() => setActiveTab("properties")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
              activeTab === "properties" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Props</span>
          </button>
        )}

        {isAuctioneer && (
          <button
            onClick={() => setActiveTab("manage-listings")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
              activeTab === "manage-listings" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
            }`}
          >
            <FolderGit className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Listings</span>
          </button>
        )}

        {!isAuctioneer && (
          <button
            onClick={() => setActiveTab("my-bids")}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
              activeTab === "my-bids" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
            }`}
          >
            <Gavel className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">My Bids</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
            activeTab === "payments" ? "text-[var(--color-primary)] scale-105 font-bold" : "text-[var(--color-muted)] font-medium"
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{isAuctioneer ? "Payments" : "Receipts"}</span>
        </button>

      </div>

    </div>
  );
}