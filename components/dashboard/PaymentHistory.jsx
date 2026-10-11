"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, FileText, Loader2, Pencil, Receipt, RefreshCw, Trash2, X } from "lucide-react";
import { deletePayment, fetchPayments, formatAmount, formatDate, getStatusColor, updatePayment } from "@/lib/payments";

export default function PaymentHistory({ role }) {
  const isAdmin = role === "ADMIN";
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [operationMessage, setOperationMessage] = useState("");
  const [operationError, setOperationError] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [purposeDraft, setPurposeDraft] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setOperationMessage("");
    setOperationError("");

    try {
      const payment = await updatePayment(selectedPayment.reference, { purpose: purposeDraft });
      setSelectedPayment(payment);
      setEditingPurpose(false);
      setOperationMessage("Payment description updated.");
      await loadPayments(true);
    } catch (updateError) {
      setOperationError(updateError.message || "Could not update payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payment) => {
    if (!window.confirm(`Delete the ${payment.gatewayStatus} payment ${payment.reference}?`)) return;
    setOperationMessage("");
    setOperationError("");

    try {
      await deletePayment(payment.reference);
      if (selectedPayment?.reference === payment.reference) setSelectedPayment(null);
      setOperationMessage("Payment record deleted.");
      await loadPayments(true);
    } catch (deleteError) {
      setOperationError(deleteError.message || "Could not delete payment.");
    }
  };

  const isPaymentComplete = (payment) =>
    ["completed", "success"].includes(payment.gatewayStatus.toLowerCase());
  const getPurposeLabel = (purpose) => ({
    ENTRY_FEE: "Auction entry fee",
    BIDDING_DEPOSIT: "Auction bidding funds / security deposit",
    BIDDING_FEE: "Auction bidding funds / security deposit",
    SECURITY_DEPOSIT: "Auction entry fee",
    DAILY_SALE_PURCHASE: "Daily sale purchase",
    PROPERTY_PURCHASE: "Property purchase",
  })[purpose] || purpose || "Payment";

  useEffect(() => {
    const timeout = setTimeout(() => loadPayments(), 0);
    return () => clearTimeout(timeout);
  }, [loadPayments]);

  return (
    <section className="payment-history-shell space-y-5">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-[var(--color-primary)]" />
          <h1 className="text-lg font-bold text-[var(--color-text)]">{isAdmin ? "Payments" : "Receipts"}</h1>
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

      {(operationMessage || operationError) && (
        <p className={`text-sm ${operationError ? "text-red-400" : "text-emerald-400"}`} role="status">
          {operationError || operationMessage}
        </p>
      )}

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
                {isAdmin && <th className="px-3 py-3 font-semibold">User</th>}
                <th className="px-3 py-3 text-right font-semibold">{isAdmin ? "Actions" : "Receipt PDF"}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-4">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{getPurposeLabel(payment.purpose)}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">{payment.reference}</p>
                  </td>
                  <td className="px-3 py-4 text-xs text-[var(--color-muted)]">{formatDate(payment.createdAt)}</td>
                  <td className="px-3 py-4 text-sm font-bold text-[var(--color-text)]">{formatAmount(payment.amount)}</td>
                  <td className="px-3 py-4">
                    <span className={`text-xs font-semibold capitalize ${getStatusColor(payment.gatewayStatus)}`}>
                      {payment.gatewayStatus}
                    </span>
                  </td>
                  {isAdmin && <td className="px-3 py-4 text-xs text-[var(--color-muted)]">User #{payment.userId}</td>}
                  <td className="px-3 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setEditingPurpose(false);
                        }}
                        className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        View
                      </button>
                      {isPaymentComplete(payment) ? (
                        <a
                          href={`/api/payments/${encodeURIComponent(payment.reference)}/receipt`}
                          download
                          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">Available after payment</span>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setPurposeDraft(payment.purpose || "");
                              setEditingPurpose(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          {["pending", "failed"].includes(payment.gatewayStatus.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(payment)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          )}
                        </>
                      )}
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
              <button type="button" onClick={() => {
                setSelectedPayment(null);
                setEditingPurpose(false);
              }} aria-label="Close receipt" className="rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-input)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Purpose</dt><dd className="text-right font-semibold">{getPurposeLabel(selectedPayment.purpose)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Amount</dt><dd className="text-right font-bold">{formatAmount(selectedPayment.amount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Status</dt><dd className={`text-right font-semibold capitalize ${getStatusColor(selectedPayment.gatewayStatus)}`}>{selectedPayment.gatewayStatus}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">Date</dt><dd className="text-right">{formatDate(selectedPayment.createdAt)}</dd></div>
              <div className="border-t border-[var(--color-border)] pt-4">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Reference</dt>
                <dd className="mt-1 break-all font-mono text-xs">{selectedPayment.reference}</dd>
              </div>
            </dl>

            {editingPurpose ? (
              <form onSubmit={handleUpdate} className="mt-6 space-y-3">
                <label htmlFor="payment-purpose" className="block text-xs font-semibold text-[var(--color-muted)]">Payment purpose</label>
                <input
                  id="payment-purpose"
                  value={purposeDraft}
                  onChange={(event) => setPurposeDraft(event.target.value)}
                  maxLength={200}
                  required
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
                {operationError && <p className="text-sm text-red-400">{operationError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save purpose
                  </button>
                  <button type="button" onClick={() => setEditingPurpose(false)} className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 flex gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setPurposeDraft(selectedPayment.purpose || "");
                      setEditingPurpose(true);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-bold hover:border-[var(--color-primary)]"
                  >
                    <Pencil className="h-4 w-4" /> Edit purpose
                  </button>
                )}
                {isPaymentComplete(selectedPayment) && (
                  <a
                    href={`/api/payments/${encodeURIComponent(selectedPayment.reference)}/receipt`}
                    download
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
                  >
                    <Download className="h-4 w-4" /> Download PDF receipt
                  </a>
                )}
              </div>
            )}
          </article>
        </div>
      )}

    </section>
  );
}
