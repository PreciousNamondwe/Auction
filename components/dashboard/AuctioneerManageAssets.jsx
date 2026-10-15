"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Home,
  Plus,
  MapPin,
  Loader2,
  PackageCheck,
  PackageX,
  Hourglass,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toggleDailySaleAvailability } from "@/app/actions/createDailySale";

/**
 * 🗂 MANAGE LISTINGS — TWO COLUMNS
 *
 * Document requirements:
 *  - Two columns: one for Daily Sales, one for Properties.
 *  - All listings made for each section are managed under their respective column.
 *  - An "Add Listing" button that redirects to a form collecting the necessary fields.
 */
export default function AuctioneerManageAssets() {
  const [dailySales, setDailySales] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/listings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load listings");
      setDailySales(json.dailySales || []);
      setProperties(json.properties || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadListings, 0);
    return () => clearTimeout(t);
  }, [loadListings]);

  const handleToggleAvailability = async (sale) => {
    try {
      setTogglingId(sale.id);
      const res = await toggleDailySaleAvailability(sale.id, !sale.isAvailable);
      if (!res.success) throw new Error(res.error);
      setDailySales((prev) =>
        prev.map((s) => (s.id === sale.id ? { ...s, isAvailable: !sale.isAvailable } : s))
      );
    } catch (err) {
      alert(err.message || "Failed to update listing.");
    } finally {
      setTogglingId(null);
    }
  };

  const formatMoney = (v) => `MK ${Number(v || 0).toLocaleString()}`;

  const ListingImage = ({ url, icon }) =>
    url ? (
      <img src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-[var(--color-input)]">
        {React.cloneElement(icon, { className: "w-6 h-6 text-[var(--color-muted)] opacity-40" })}
      </div>
    );

  return (
    <div className="space-y-6 pb-10">
      {/* Header row */}
      <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text)]">Manage Listings</h2>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            Add and manage daily sales and property listings in their respective sections.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-5 bg-[var(--color-input)] rounded w-1/3" />
              <div className="h-24 bg-[var(--color-input)] rounded-xl" />
              <div className="h-24 bg-[var(--color-input)] rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-[var(--color-card)] border border-red-500/20 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-red-400 font-medium">{error}</p>
          <button onClick={loadListings} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-input)] rounded-xl text-xs font-bold text-[var(--color-text)] hover:border-[var(--color-primary)]/30 transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══════════ COLUMN 1: DAILY SALES ═══════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-secondary)]/15 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-[var(--color-text)]">Daily Sales</h3>
                  <p className="text-[10px] text-[var(--color-muted)]">{dailySales.length} commodity listing{dailySales.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <Link
                href="/dashboard/add-listing?mode=daily-sale"
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-secondary)]/15 text-[var(--color-primary)] rounded-lg text-[10px] font-bold border border-[var(--color-primary)]/20 hover:bg-[var(--color-secondary)]/25 transition-all"
              >
                <Plus className="w-3 h-3" /> Add
              </Link>
            </div>

            {dailySales.length === 0 ? (
              <div className="bg-[var(--color-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
                <ShoppingBag className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3 opacity-40" />
                <p className="text-xs text-[var(--color-muted)] font-medium">No daily sale listings yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailySales.map((sale) => (
                  <div key={sale.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3 flex gap-3 hover:border-[var(--color-primary)]/30 transition-all">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                      <ListingImage url={sale.imageUrl} icon={<ShoppingBag />} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[var(--color-text)] truncate">{sale.title}</h4>
                        <button
                          onClick={() => handleToggleAvailability(sale)}
                          disabled={togglingId === sale.id}
                          title={sale.isAvailable ? "Mark as sold out" : "Restock listing"}
                          className="shrink-0 p-1.5 rounded-lg bg-[var(--color-input)] text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                        >
                          {togglingId === sale.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : sale.isAvailable ? (
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <PackageX className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] mt-1">
                        <MapPin className="w-2.5 h-2.5" /> Client: {sale.clientName}
                        <span className="mx-1">•</span> {sale.category}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-extrabold text-[var(--color-primary)]">{formatMoney(sale.price)}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${sale.isAvailable ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {sale.isAvailable ? `Available${sale.stockCount > 1 ? ` ×${sale.stockCount}` : ""}` : "Sold Out"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══════════ COLUMN 2: PROPERTIES ═══════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-secondary)]/15 flex items-center justify-center">
                  <Home className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-[var(--color-text)]">Properties</h3>
                  <p className="text-[10px] text-[var(--color-muted)]">{properties.length} property listing{properties.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <Link
                href="/dashboard/add-listing?mode=property"
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-secondary)]/15 text-[var(--color-primary)] rounded-lg text-[10px] font-bold border border-[var(--color-primary)]/20 hover:bg-[var(--color-secondary)]/25 transition-all"
              >
                <Plus className="w-3 h-3" /> Add
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="bg-[var(--color-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
                <Home className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3 opacity-40" />
                <p className="text-xs text-[var(--color-muted)] font-medium">No property listings yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((item) => (
                  <div key={item.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3 flex gap-3 hover:border-[var(--color-primary)]/30 transition-all">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                      <ListingImage url={item.imageUrl} icon={<Home />} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[var(--color-text)] truncate">{item.title}</h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20 bg-[var(--color-secondary)]/10 text-[var(--color-primary)]">
                          {item.listingType === "LEASE" ? "For Lease" : item.listingType === "SALE" ? "For Sale" : item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] mt-1">
                        <MapPin className="w-2.5 h-2.5" /> Client: {item.clientName}
                        <span className="mx-1">•</span> {item.category}
                      </div>
                      {item.listingType === "AUCTION" ? <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                        <div>
                          <p className="text-[var(--color-muted)] uppercase font-bold text-[8px]">Start</p>
                          <p className="font-bold text-[var(--color-text)]">{formatMoney(item.startingBid)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-muted)] uppercase font-bold text-[8px]">Reserve</p>
                          <p className="font-bold text-[var(--color-text)]">{formatMoney(item.reservePrice)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-muted)] uppercase font-bold text-[8px]">Entry fee</p>
                          <p className="font-bold text-[var(--color-primary)]">{formatMoney(item.entryFee)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-muted)] uppercase font-bold text-[8px]">Bidding deposit</p>
                          <p className="font-bold text-[var(--color-primary)]">{formatMoney(item.biddingDeposit)}</p>
                        </div>
                      </div> : (
                        <div className="mt-2 text-[10px]">
                          <p className="text-[var(--color-muted)] uppercase font-bold text-[8px]">{item.listingType === "LEASE" ? "Monthly rent" : "Asking price"}</p>
                          <p className="font-bold text-[var(--color-primary)]">{formatMoney(item.listingType === "LEASE" ? item.monthlyRent : item.askingPrice)}{item.listingType === "LEASE" ? " / month" : ""}</p>
                          {item.listingType === "LEASE" && <p className="mt-1 text-[var(--color-muted)]">Rent due on day {item.rentDueDay} each month</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
