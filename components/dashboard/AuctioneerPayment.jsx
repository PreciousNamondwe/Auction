"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Wallet, Crown, Zap, Building2, CheckCircle,
  ArrowRight, Loader2, X, AlertCircle, RefreshCw, User, LogIn,
  ExternalLink, Bug, Star, ShieldCheck, Clock
} from "lucide-react";
import {
  initiatePayment, fetchPayments, fetchUserProfile,
  generateTxRef, formatAmount, formatDate, parseName,
  getStatusColor, getMethodStyle,
} from "@/lib/payments";

const CALLBACK_URL = process.env.NEXT_PUBLIC_PAYCHANGU_CALLBACK_URL;
const RETURN_URL = process.env.NEXT_PUBLIC_PAYCHANGU_RETURN_URL;

// ═══════════════════════════════════════════════════════════════════
//  SUBSCRIPTION TIER CARD
// ═══════════════════════════════════════════════════════════════════

const TierCard = ({ tier, isSelected, onSelect, onSubscribe, isLoading }) => (
  <div
    onClick={onSelect}
    className={`relative p-6 rounded-2xl border cursor-pointer transition-all group ${
      isSelected
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg shadow-[var(--color-primary)]/10"
        : "border-[var(--color-border)] bg-[var(--color-input)] hover:border-[var(--color-primary)]/30"
    }`}
  >
    {tier.popular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-full">
        Most Popular
      </div>
    )}

    <div className="flex items-center gap-3 mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tier.iconColor}`}>
        <tier.icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--color-text)]">{tier.name}</p>
        <p className="text-[10px] text-[var(--color-muted)]">{tier.subtitle}</p>
      </div>
    </div>

    <div className="mb-4">
      <span className="text-3xl font-extrabold text-[var(--color-text)]">{tier.price}</span>
      <span className="text-xs text-[var(--color-muted)]"> / {tier.period}</span>
    </div>

    <ul className="space-y-2.5 mb-6">
      {tier.features.map((feature, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--color-muted)]">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>

    <button
      onClick={(e) => {
        e.stopPropagation();
        onSubscribe(tier);
      }}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
          : "bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/30"
      }`}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
      {isSelected ? "Subscribe Now" : "Select Plan"}
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
//  PAYCHANGU SUBSCRIPTION MODAL
// ═══════════════════════════════════════════════════════════════════

const SubscriptionModal = ({ isOpen, onClose, tier, onSuccess, user }) => {
  const [step, setStep] = useState("form");
  const [error, setError] = useState(null);
  const [txRef, setTxRef] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      setStep("form");
      setError(null);
      setTxRef(null);
      setCheckoutUrl(null);
      setDebugInfo(null);
      if (user) {
        const { firstName, lastName } = parseName(user.name);
        setFormData({
          firstName, lastName,
          email: user.email || "",
          phone: user.phoneNumber || "",
        });
      } else {
        setFormData({ firstName: "", lastName: "", email: "", phone: "" });
      }
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, user]);

  if (!isOpen || !tier) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep("processing");
    setError(null);
    setDebugInfo(null);

    try {
      const ref = generateTxRef();
      setTxRef(ref);

      const numericAmount = parseFloat(tier.rawPrice);

      console.log("[Auctioneer Payment] Initiating subscription:", {
        amount: numericAmount, tx_ref: ref, tier: tier.name,
      });

      const data = await initiatePayment({
        amount: numericAmount,
        currency: "MWK",
        tx_ref: ref,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        method: "card",
        purpose: `AUCTIONEER_SUBSCRIPTION_${tier.key.toUpperCase()}`,
        callback_url: CALLBACK_URL,
        return_url: RETURN_URL,
      });

      console.log("[Auctioneer Payment] Response:", data);
      setDebugInfo(data);

      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        setStep("redirect");
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1500);
        return;
      }

      setStep("no-redirect");
      onSuccess?.(ref, data);
    } catch (err) {
      console.error("[Auctioneer Payment] Failed:", err);
      setError(err.message);
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] w-full max-w-lg rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)]">Subscribe to {tier.name}</h3>
              <p className="text-[10px] text-[var(--color-muted)]">{tier.price} / {tier.period} — PayChangu Checkout</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-input)] transition-colors">
            <X className="w-4 h-4 text-[var(--color-muted)]" />
          </button>
        </div>

        <div className="p-5">
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {user && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <User className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-[10px] text-emerald-400 font-bold">Auto-filled from your profile</p>
                    <p className="text-[10px] text-[var(--color-muted)]">{user.name} • {user.email}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">First Name</label>
                  <input type="text" required value={formData.firstName}
                    onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">Last Name</label>
                  <input type="text" required value={formData.lastName}
                    onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">Email</label>
                <input type="email" required value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors" />
              </div>

              <div>
                <label className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1.5 block">Phone (optional)</label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  placeholder="+265 88X XXX XXX" />
              </div>

              <div className="p-3 bg-[var(--color-input)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider">Plan</span>
                  <span className="text-xs font-bold text-[var(--color-text)]">{tier.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider">Amount</span>
                  <span className="text-sm font-extrabold text-[var(--color-primary)]">{tier.price}</span>
                </div>
              </div>

              <button type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-primary)]/90 transition-all active:scale-[0.98]">
                <Crown className="w-4 h-4" />
                Proceed to PayChangu
              </button>
            </form>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto" />
              <p className="text-sm font-bold text-[var(--color-text)]">Connecting to PayChangu...</p>
              <p className="text-[10px] font-mono text-[var(--color-muted)]">{txRef}</p>
            </div>
          )}

          {step === "redirect" && (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <ExternalLink className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">Redirecting to PayChangu</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">Complete your subscription payment securely</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                <span className="text-[10px] text-emerald-400 font-mono">{txRef}</span>
              </div>
              <a href={checkoutUrl}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--color-primary)]/90 transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
                Go to Checkout Now
              </a>
            </div>
          )}

          {step === "no-redirect" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
                <Bug className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">No Checkout URL Received</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">Debug info below:</p>
              </div>
              <div className="text-left bg-black/40 rounded-lg p-3 overflow-x-auto">
                <p className="text-[10px] text-yellow-400 font-bold mb-1">Raw Response:</p>
                <pre className="text-[10px] text-[var(--color-muted)] font-mono whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setStep("form")}
                  className="px-4 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-xs font-bold">
                  Try Again
                </button>
                <button onClick={onClose}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-bold">
                  Close
                </button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm font-bold text-[var(--color-text)]">Payment Failed</p>
              <p className="text-xs text-[var(--color-muted)]">{error}</p>
              {debugInfo && (
                <div className="text-left bg-black/40 rounded-lg p-3 overflow-x-auto">
                  <p className="text-[10px] text-yellow-400 font-bold mb-1">Debug:</p>
                  <pre className="text-[10px] text-[var(--color-muted)] font-mono whitespace-pre-wrap">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
              <button onClick={() => setStep("form")}
                className="px-6 py-2.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg text-xs font-bold">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN AUCTIONEER PAYMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function AuctioneerPayment() {
  const { data: session, status } = useSession();
  const [selectedTier, setSelectedTier] = useState("pro");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTier, setModalTier] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [dbUser, setDbUser] = useState(null);

  const currentUser = dbUser || session?.user || null;

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const payments = await fetchPayments();
      // Filter only auctioneer subscription payments
      const subs = payments.filter(p =>
        p.purpose && p.purpose.includes("AUCTIONEER_SUBSCRIPTION")
      );
      setTransactions(subs);
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session?.user) return;
    try {
      const user = await fetchUserProfile();
      setDbUser(user);
    } catch (err) {
      console.error("Could not load DB profile:", err);
    }
  }, [session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const loadData = async () => {
      await loadTransactions();
      await loadProfile();
    };
    loadData();
  }, [status, loadTransactions, loadProfile]);

  const tiers = [
    {
      key: "starter",
      name: "Starter",
      subtitle: "For individual auctioneers",
      price: "MK 25,000",
      rawPrice: 25000,
      period: "month",
      icon: Zap,
      iconColor: "bg-blue-500",
      popular: false,
      features: [
        "List up to 10 active auctions",
        "Basic bidder analytics",
        "Email support",
        "Standard commission (5%)",
        "Mobile money payouts",
      ],
    },
    {
      key: "pro",
      name: "Professional",
      subtitle: "For growing auction houses",
      price: "MK 75,000",
      rawPrice: 75000,
      period: "month",
      icon: Star,
      iconColor: "bg-[var(--color-primary)]",
      popular: true,
      features: [
        "Unlimited active auctions",
        "Advanced analytics & reports",
        "Priority support",
        "Reduced commission (3.5%)",
        "Bank & mobile payouts",
        "Featured listing slots",
        "Custom branding",
      ],
    },
    {
      key: "enterprise",
      name: "Enterprise",
      subtitle: "For large-scale operations",
      price: "MK 200,000",
      rawPrice: 200000,
      period: "month",
      icon: Crown,
      iconColor: "bg-purple-600",
      popular: false,
      features: [
        "Everything in Professional",
        "Dedicated account manager",
        "API access for integrations",
        "White-label options",
        "Lowest commission (2%)",
        "Instant settlements",
        "Multi-auctioneer accounts",
        "Custom contract terms",
      ],
    },
  ];

  const handleSubscribe = (tier) => {
    setModalTier(tier);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setTimeout(loadTransactions, 2000);
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <LogIn className="w-12 h-12 text-[var(--color-muted)]" />
        <p className="text-lg font-bold text-[var(--color-text)]">Please sign in to manage subscriptions</p>
        <a href="/login" className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-bold">Sign In</a>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  const activeTier = tiers.find(t => t.key === selectedTier);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      {currentUser && (
        <div className="bg-[var(--color-card)] p-4 rounded-xl border border-[var(--color-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--color-text)]">{currentUser.name}</p>
            <p className="text-[10px] text-[var(--color-muted)]">
              {currentUser.email}
              {currentUser.phoneNumber && ` • ${currentUser.phoneNumber}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">Auctioneer</span>
          </div>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Subscription Plans</h2>
            <p className="text-xs text-[var(--color-muted)]">Choose a plan to activate your auctioneer services</p>
          </div>
          <Crown className="w-5 h-5 text-[var(--color-primary)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <TierCard
              key={tier.key}
              tier={tier}
              isSelected={selectedTier === tier.key}
              onSelect={() => setSelectedTier(tier.key)}
              onSubscribe={handleSubscribe}
              isLoading={false}
            />
          ))}
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Service Status</h2>
            <p className="text-xs text-[var(--color-muted)]">Your current subscription and platform access</p>
          </div>
          <Clock className="w-5 h-5 text-[var(--color-primary)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Current Plan</p>
            <p className="text-2xl font-extrabold text-[var(--color-text)]">
              {transactions.length > 0 ? "Active" : "Inactive"}
            </p>
            <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
              <div className={`h-full rounded-full ${transactions.length > 0 ? "bg-emerald-400 w-full" : "bg-red-400 w-1/4"}`} />
            </div>
          </div>
          <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Total Subscribed</p>
            <p className="text-2xl font-extrabold text-[var(--color-primary)]">
              {formatAmount(transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0))}
            </p>
            <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '65%' }} />
            </div>
          </div>
          <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-2">Transactions</p>
            <p className="text-2xl font-extrabold text-[var(--color-text)]">{transactions.length}</p>
            <div className="w-full h-1 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[var(--color-secondary)] rounded-full" style={{ width: `${Math.min(transactions.length * 10, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Subscription History</h2>
          <button onClick={loadTransactions} disabled={txLoading} className="p-2 rounded-lg hover:bg-[var(--color-input)]">
            <RefreshCw className={`w-4 h-4 text-[var(--color-muted)] ${txLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl">
              <Wallet className="w-8 h-8 text-[var(--color-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--color-muted)]">No subscription payments yet</p>
              <p className="text-[10px] text-[var(--color-muted)] mt-1">Subscribe to a plan to start listing auctions</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const style = getMethodStyle(tx.method);
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${style.bg}`}>
                      <Crown className={`w-4 h-4 ${style.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text)]">{tx.purpose?.replace("AUCTIONEER_SUBSCRIPTION_", "") || "Subscription"}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">{tx.method || "PayChangu"} • {formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--color-text)]">{formatAmount(tx.amount)}</p>
                    <span className={`text-[10px] font-bold ${getStatusColor(tx.gatewayStatus)}`}>{tx.gatewayStatus}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tier={modalTier}
        onSuccess={handleSuccess}
        user={currentUser}
      />
    </div>
  );
}