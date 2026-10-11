"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, Loader2, RefreshCw, Wallet } from "lucide-react";

export default function AuctioneerFinance({ view = "payments" }) {
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/auctioneer/finance");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load finance.");
      setFinance(result.data);
    } catch (loadError) {
      setError(loadError.message || "Could not load finance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadFinance, 0);
    return () => clearTimeout(timer);
  }, [loadFinance]);

  const amount = (value) => `MWK ${Number(value || 0).toLocaleString()}`;
  const date = (value) => value ? new Date(value).toLocaleDateString() : "—";
  const summary = finance?.summary;
  const isReport = view === "reports";

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" /></div>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-[var(--color-card)] p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <p className="mb-4 text-sm text-red-400">{error}</p>
        <button onClick={loadFinance} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const cards = [
    ["Total recorded revenue", summary.totalRevenue, Wallet],
    ["Daily sales revenue", summary.dailySalesRevenue, BarChart3],
    ["Property sales revenue", summary.propertySalesRevenue, BarChart3],
    ["Auction access fees", summary.auctionAccessRevenue, Wallet],
  ];

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">{isReport ? "Sales Report" : "Payments Received"}</h1>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Successful daily sales, property purchases, auction entry fees, and bidding deposits.
          </p>
        </div>
        <button onClick={loadFinance} aria-label="Refresh finance" className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)]">
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <article key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <Icon className="mb-3 h-4 w-4 text-[var(--color-primary)]" />
            <p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">{label}</p>
            <p className="mt-1 text-lg font-extrabold text-[var(--color-text)]">{amount(value)}</p>
          </article>
        ))}
      </div>

      {isReport && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs text-[var(--color-muted)]">Items sold</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{summary.goodsSold}</p>
          <p className="mt-3 text-xs text-[var(--color-muted)]">Recorded transactions: {summary.transactionCount}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        {finance.transactions.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No completed transactions have been recorded yet.</p>
        ) : (
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-muted)]">
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {finance.transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{transaction.title}</p>
                    <p className="text-[10px] text-[var(--color-muted)]">{transaction.type} · {transaction.reference}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text)]">{transaction.buyerName}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{date(transaction.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{transaction.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-[var(--color-primary)]">{amount(transaction.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10px] text-[var(--color-muted)]">Revenue reflects completed payments recorded in TrustBid; auction winning bids are not included until paid.</p>
    </section>
  );
}
