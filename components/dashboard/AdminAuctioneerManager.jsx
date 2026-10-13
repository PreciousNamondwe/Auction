"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, Users } from "lucide-react";

const emptyForm = {
  name: "",
  email: "",
  phoneNumber: "",
  postalAddress: "",
  addressLine1: "",
  addressLine2: "",
  district: "",
  businessName: "",
  nationalId: "",
  password: "",
};

const fields = [
  ["name", "Full name", true],
  ["email", "Email", true],
  ["phoneNumber", "Phone number", true],
  ["postalAddress", "Postal address", true],
  ["addressLine1", "Address line 1", true],
  ["addressLine2", "Address line 2", true],
  ["district", "District / city", false],
  ["businessName", "Business / agency", false],
  ["nationalId", "National ID / registration number", false],
  ["password", "Initial password (12+ characters)", true],
];

async function fetchAuctioneerData() {
  const [auctioneerResponse, refundResponse] = await Promise.all([
    fetch("/api/admin/auctioneers"),
    fetch("/api/admin/auction-refunds"),
  ]);
  const [auctioneerData, refundData] = await Promise.all([
    auctioneerResponse.json(),
    refundResponse.json(),
  ]);
  if (!auctioneerResponse.ok) throw new Error(auctioneerData.error || "Could not load auctioneers.");
  if (!refundResponse.ok) throw new Error(refundData.error || "Could not load refunds.");
  return { auctioneers: auctioneerData.auctioneers || [], refunds: refundData.refunds || [] };
}

export default function AdminAuctioneerManager() {
  const [auctioneers, setAuctioneers] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [processingRefundId, setProcessingRefundId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAuctioneers = useCallback(async () => {
    try {
      const data = await fetchAuctioneerData();
      setError("");
      setAuctioneers(data.auctioneers);
      setRefunds(data.refunds);
    } catch (loadError) {
      setError(loadError.message || "Could not load auctioneers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    fetchAuctioneerData()
      .then((data) => {
        if (!current) return;
        setAuctioneers(data.auctioneers);
        setRefunds(data.refunds);
      })
      .catch((loadError) => {
        if (current) setError(loadError.message || "Could not load auctioneers.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/auctioneers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the account.");
      setForm(emptyForm);
      setNotice(`Auctioneer account created for ${data.auctioneer.email}.`);
      await loadAuctioneers();
    } catch (saveError) {
      setError(saveError.message || "Could not create the account.");
    } finally {
      setSaving(false);
    }
  };

  const handleProcessRefund = async (refundId) => {
    const gatewayReference = window.prompt("Enter the PayChangu payout / refund reference after processing the refund.");
    if (!gatewayReference?.trim()) return;
    setProcessingRefundId(refundId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/auction-refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundId, gatewayReference: gatewayReference.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record the refund.");
      setNotice(data.emailWarning || "Refund marked as paid and the bidder was notified.");
      await loadAuctioneers();
    } catch (processError) {
      setError(processError.message || "Could not record the refund.");
    } finally {
      setProcessingRefundId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5 text-[var(--color-primary)]" /> Auctioneer accounts
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Create accounts only after verifying the auctioneer&apos;s identity and contact details. Public registration remains bidder-only.
        </p>
      </header>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400" role="alert">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400" role="status">{notice}</p>}

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:grid-cols-2">
        {fields.map(([name, label, required]) => (
          <label key={name} className="space-y-1.5 text-xs font-semibold text-[var(--color-muted)]">
            <span>{label}{required ? " *" : ""}</span>
            <input
              name={name}
              type={name === "email" ? "email" : name === "password" ? "password" : "text"}
              value={form[name]}
              onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
              required={required}
              minLength={name === "password" ? 12 : undefined}
              maxLength={name === "phoneNumber" ? 20 : undefined}
              autoComplete={name === "password" ? "new-password" : undefined}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {saving ? "Creating account…" : "Register auctioneer"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h3 className="mb-4 text-sm font-bold">Registered auctioneers</h3>
        {loading ? <p className="text-sm text-[var(--color-muted)]">Loading accounts…</p> : auctioneers.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No auctioneer accounts have been registered.</p>
        ) : (
          <div className="space-y-3">
            {auctioneers.map((auctioneer) => (
              <article key={auctioneer.id} className="grid gap-1 rounded-xl border border-[var(--color-border)] p-3 text-sm sm:grid-cols-2">
                <strong>{auctioneer.name}</strong><span className="text-[var(--color-muted)]">{auctioneer.email}</span>
                <span className="text-[var(--color-muted)]">{auctioneer.phoneNumber}</span>
                <span className="text-[var(--color-muted)]">{[auctioneer.addressLine1, auctioneer.addressLine2, auctioneer.district, auctioneer.postalAddress].filter(Boolean).join(", ")}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h3 className="mb-1 text-sm font-bold">Bidding deposit refunds</h3>
        <p className="mb-4 text-xs text-[var(--color-muted)]">
          Process the refund through PayChangu first, then record its reference here. A refund marked pending has not yet been transferred.
        </p>
        {refunds.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No deposit refunds are queued.</p>
        ) : (
          <div className="space-y-3">
            {refunds.map((refund) => (
              <article key={refund.id} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm">
                  <strong>{refund.bidderName} · MWK {Number(refund.amount).toLocaleString()}</strong>
                  <p className="text-xs text-[var(--color-muted)]">{refund.bidderEmail} · {refund.auctionTitle}</p>
                  <p className="text-xs text-[var(--color-muted)]">{refund.reason.replaceAll("_", " ")} · {refund.status}{refund.gatewayReference ? ` · ${refund.gatewayReference}` : ""}</p>
                </div>
                {refund.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => handleProcessRefund(refund.id)}
                    disabled={processingRefundId === refund.id}
                    className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {processingRefundId === refund.id ? "Saving…" : "Record completed refund"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
