"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Gavel,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Receipt,
  MapPin,
} from "lucide-react";
import {
  initiatePayment,
  fetchUserProfile,
  formatAmount,
  parseName,
} from "@/lib/payments";
import {
  getAuctionAccessStatus,
  startEntryFeePayment,
  startBiddingDepositPayment,
  confirmAuctionAccessPayment,
} from "@/app/actions/auctionAccess";

const CALLBACK_URL = process.env.NEXT_PUBLIC_PAYCHANGU_CALLBACK_URL;

/**
 * One row of the entry fee / bidding deposit sequence.
 * Declared outside the gate component so it is not re-created on every render.
 */
const FeeStepRow = ({ label, amount, done, active, busy, pending, onPay }) => (
  <div
    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
      done
        ? "bg-emerald-500/5 border-emerald-500/20"
        : active
        ? "bg-[var(--color-secondary)]/5 border-[var(--color-primary)]/30"
        : "bg-[var(--color-input)]/40 border-[var(--color-border)] opacity-70"
    }`}
  >
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      ) : active ? (
        <div className="w-5 h-5 rounded-full border-2 border-[var(--color-primary)] flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
        </div>
      ) : (
        <Lock className="w-4 h-4 text-[var(--color-muted)]" />
      )}
      <div>
        <p className="text-sm font-bold text-[var(--color-text)]">{label}</p>
        <p className="text-[10px] text-[var(--color-muted)]">
          {done
            ? "Payment confirmed"
            : active
            ? busy
              ? "Confirming your payment…"
              : "Required to continue"
            : "Locked until the previous step clears"}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-extrabold text-[var(--color-primary)]">{formatAmount(amount)}</p>
      {active && !done && (
        <button
          onClick={onPay}
          disabled={busy}
          className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
          {busy ? "Confirming…" : pending ? "Check Payment" : "Pay Now"}
        </button>
      )}
    </div>
  </div>
);

/**
 * 🎟 LIVE AUCTION ACCESS GATE
 *
 * Document flow (enforced in order):
 *   Step 1 — pay the BIDDING FEE.
 *   Step 2 — on confirmation, pay the bidding funds/security deposit.
 *   Step 3 — only after BOTH payments are confirmed does the system direct the
 *            user to the auction room.
 */
export default function AuctionAccessGate({ open, onClose, auctionItemId, roomId, onAccessGranted }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stepState, setStepState] = useState("idle"); // idle | paying | confirming | error
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [activeFee, setActiveFee] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAuctionAccessStatus(auctionItemId);
      if (res.success) {
        let status = res.data;
        let confirmationError = null;
        const pendingPayments = [
          ["ENTRY_FEE", status.pendingEntryFeeRef],
          ["BIDDING_DEPOSIT", status.pendingBiddingDepositRef],
        ].filter(([, reference]) => reference);

        for (const [feeType, reference] of pendingPayments) {
          const confirmation = await confirmAuctionAccessPayment(auctionItemId, feeType, reference);
          if (!confirmation.success) {
            confirmationError = confirmation.error;
            break;
          }
        }

        if (pendingPayments.length > 0) {
          const refreshed = await getAuctionAccessStatus(auctionItemId);
          if (refreshed.success) status = refreshed.data;
        }
        setStatus(status);
        setError(confirmationError);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auctionItemId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      loadStatus();
      fetchUserProfile()
        .then(setUser)
        .catch(() => setUser(null));
    }, 0);
    return () => clearTimeout(t);
  }, [open, loadStatus]);

  if (!open) return null;

  const payFee = async (feeType) => {
    setActiveFee(feeType);
    setStepState("paying");
    setError(null);

    try {
      // 1. Register the pending access payment server-side
      const startRes =
        feeType === "ENTRY_FEE"
          ? await startEntryFeePayment(auctionItemId)
          : await startBiddingDepositPayment(auctionItemId);

      if (!startRes.success) throw new Error(startRes.error);
      if (startRes.data?.alreadyPaid) {
        const refreshed = await getAuctionAccessStatus(auctionItemId);
        if (refreshed.success && refreshed.data.nextStep === "ACCESS_GRANTED") {
          onAccessGranted?.(refreshed.data);
          onClose?.();
        } else {
          await loadStatus();
        }
        return;
      }
      if (startRes.data?.alreadyPending) {
        await loadStatus();
        return;
      }

      const ref = startRes.data.paymentRef;
      if (!ref) throw new Error("Could not create a secure payment reference.");

      // 2. Initiate the PayChangu checkout
      const { firstName, lastName } = parseName(user?.name || "");
      const returnUrl = new URL("/dashboard", window.location.origin);
      returnUrl.searchParams.set("tab", "live-auctions");
      returnUrl.searchParams.set("access_payment_ref", ref);
      returnUrl.searchParams.set("access_auction_id", String(auctionItemId));
      returnUrl.searchParams.set("access_fee_type", feeType);
      returnUrl.searchParams.set("access_room_id", roomId);

      const initRes = await initiatePayment({
        amount: startRes.data.amount,
        currency: "MWK",
        tx_ref: ref,
        email: user?.email || "",
        first_name: firstName,
        last_name: lastName,
        phone: user?.phoneNumber || "",
        method: "card",
        purpose: feeType,
        callback_url: CALLBACK_URL,
        return_url: returnUrl.toString(),
      });

      if (!initRes.checkoutUrl) {
        throw new Error("Gateway did not return a checkout link. Try again.");
      }

      setStepState("confirming");
      window.location.assign(initRes.checkoutUrl);
    } catch (err) {
      console.error("[AccessGate]", err);
      setError(err.message);
      setStepState("error");
    } finally {
      setActiveFee(null);
    }
  };

  const nextStep = status?.nextStep;
  const entryFeeDone = status?.entryFeePaid;
  const biddingDepositDone = status?.biddingDepositPaid;

  const isFeeBusy = (feeType) =>
    (stepState === "paying" || stepState === "confirming") && activeFee === feeType;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] w-full max-w-lg rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)]">Join Live Auction</h3>
              <p className="text-[10px] text-[var(--color-muted)] flex items-center gap-1">
                {status?.itemTitle || "Auction Lot"}
                {status?.location && (
                  <>
                    <MapPin className="w-2.5 h-2.5" /> {status.location}
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-input)] transition-colors text-[var(--color-muted)] text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Progress rail */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1.5">
            {[entryFeeDone, biddingDepositDone, nextStep === "ACCESS_GRANTED"].map((done, i) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-[var(--color-input)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    done ? "bg-emerald-400 w-full" : "bg-[var(--color-primary)]/40 w-1/3"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : error && !status ? (
            <div className="flex items-center gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-400 font-medium">{error}</p>
            </div>
          ) : (
            <>
              {/* Notice */}
              <div className="flex items-start gap-2 p-3 bg-[var(--color-secondary)]/5 border border-[var(--color-primary)]/15 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                  To enter this auction room, pay the <span className="font-bold text-[var(--color-text)]">entry fee</span> first, then the{" "}
                  <span className="font-bold text-[var(--color-text)]">bidding funds / security deposit</span> used during auction bidding. Both payments
                  are confirmed before the room opens for you.
                </p>
              </div>

              <FeeStepRow
                label="Entry Fee"
                amount={status?.entryFee ?? 0}
                done={entryFeeDone}
                active={nextStep === "ENTRY_FEE"}
                busy={isFeeBusy("ENTRY_FEE")}
                pending={Boolean(status?.pendingEntryFeeRef)}
                onPay={() => status?.pendingEntryFeeRef ? loadStatus() : payFee("ENTRY_FEE")}
              />

              <FeeStepRow
                label="Bidding Funds / Security Deposit"
                amount={status?.biddingDeposit ?? 0}
                done={biddingDepositDone}
                active={nextStep === "BIDDING_DEPOSIT"}
                busy={isFeeBusy("BIDDING_DEPOSIT")}
                pending={Boolean(status?.pendingBiddingDepositRef)}
                onPay={() => status?.pendingBiddingDepositRef ? loadStatus() : payFee("BIDDING_DEPOSIT")}
              />

              {error && stepState === "error" && (
                <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{error}</p>
                </div>
              )}

              {stepState === "confirming" && (
                <div className="flex items-center gap-2 p-3 bg-[var(--color-secondary)]/5 border border-[var(--color-primary)]/20 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                  <p className="text-[11px] text-[var(--color-text)]">Confirming your payment with the gateway...</p>
                </div>
              )}

              {nextStep === "ACCESS_GRANTED" && (
                <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">All payments confirmed!</p>
                    <p className="text-[10px] text-[var(--color-muted)]">Directing you to the auction room…</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-[var(--color-muted)] border-t border-[var(--color-border)]">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3 h-3" />
                  Total to pay: {formatAmount((status?.entryFee || 0) + (status?.biddingDeposit || 0))}
                </span>
                <span>Secured via PayChangu</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
