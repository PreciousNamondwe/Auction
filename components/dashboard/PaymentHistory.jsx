"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, FileText, Loader2, Receipt, RefreshCw, X } from "lucide-react";
import { fetchPayments, formatAmount, formatDate, getStatusColor } from "@/lib/payments";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);

  const loadPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setPayments(await fetchPayments());
    } catch (loadError) {
      setError(loadError.message || "Could not load payment history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadPayments(), 0);
    return () => clearTimeout(timeout);
  }, [loadPayments]);

  return (
    <section className="payment-history-shell space-y-5">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-[var(--color-primary)]" />
          <h1 className="text-lg font-bold text-[var(--color-text)]">Payments &amp; Receipts</h1>
        </div>
        <button
          type="button"
          onClick={() => loadPayments(true)}
          disabled={loading || refreshing}
          aria-label="Refresh payment history"
          title="Refresh payment history"
          className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] transition hover:text-[var(--color-text)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading payment history">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" onClick={() => loadPayments()} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
            Try again
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <FileText className="h-9 w-9 text-[var(--color-muted)]" />
          <p className="text-sm font-semibold text-[var(--color-text)]">No payment history</p>
          <p className="text-xs text-[var(--color-muted)]">Transactions will appear here when they are recorded.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                <th className="px-3 py-3 font-semibold">Transaction</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Receipt PDF</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-4">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{payment.purpose || "Payment"}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">{payment.reference}</p>
                  </td>
                  <td className="px-3 py-4 text-xs text-[var(--color-muted)]">{formatDate(payment.createdAt)}</td>
                  <td className="px-3 py-4 text-sm font-bold text-[var(--color-text)]">{formatAmount(payment.amount)}</td>
                  <td className="px-3 py-4">
                    <span className={`text-xs font-semibold capitalize ${getStatusColor(payment.gatewayStatus)}`}>
                      {payment.gatewayStatus}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        View
                      </button>
                      <a
                        href={`/api/payments/${encodeURIComponent(payment.reference)}/receipt`}
                        download
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedPayment(null);
        }}>
          <article className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-[var(--color-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
            <div className="mb-5 flex items-start justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Transaction record</p>
                <h2 id="receipt-title" className="mt-1 text-lg font-bold">Payment receipt</h2>
              </div>
              <button type="button" onClick={() => setSelectedPayment(null)} aria-label="Close receipt" className="rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-input)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Purpose</dt><dd className="text-right font-semibold">{selectedPayment.purpose || "Payment"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Amount</dt><dd className="text-right font-bold">{formatAmount(selectedPayment.amount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Status</dt><dd className={`text-right font-semibold capitalize ${getStatusColor(selectedPayment.gatewayStatus)}`}>{selectedPayment.gatewayStatus}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Date</dt><dd className="text-right">{formatDate(selectedPayment.createdAt)}</dd></div>
              <div className="border-t border-[var(--color-border)] pt-4">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Reference</dt>
                <dd className="mt-1 break-all font-mono text-xs">{selectedPayment.reference}</dd>
              </div>
            </dl>

            <a
              href={`/api/payments/${encodeURIComponent(selectedPayment.reference)}/receipt`}
              download
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Download PDF receipt
            </a>
          </article>
        </div>
      )}

    </section>
  );
}
