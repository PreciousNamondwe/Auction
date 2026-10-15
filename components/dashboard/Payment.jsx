"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Wallet, CreditCard, Building2, Smartphone, CheckCircle,
  ArrowRight, Loader2, X, AlertCircle, RefreshCw, User, LogIn,
  ExternalLink, Bug,
} from "lucide-react";
import {
  initiatePayment, fetchPayments, fetchUserProfile,
  generateTxRef, formatAmount, formatDate, parseName,
  getStatusColor, getMethodStyle,
} from "@/lib/payments";

const CALLBACK_URL = process.env.NEXT_PUBLIC_PAYCHANGU_CALLBACK_URL;
const RETURN_URL = process.env.NEXT_PUBLIC_PAYCHANGU_RETURN_URL;

const PaymentCard = ({ title, icon: Icon, amount, description, status, statusColor, onPay, isLoading }) => (
  <div className="bg-[var(--color-input)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center group-hover:bg-[var(--color-primary)]/20 transition-colors">
          <Icon className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
          <p className="text-[10px] text-[var(--color-muted)]">{description}</p>
        </div>
      </div>
      <div className={`px-2.5 py-1 rounded-lg ${statusColor}`}>
        <span className="text-[10px] font-bold">{status}</span>
      </div>
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[10px] text-[var(--color-muted)] uppercase font-bold tracking-wider mb-1">Balance</p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{amount}</p>
      </div>
      <button
        onClick={onPay}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--color-primary)]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        Pay Now
      </button>
    </div>
  </div>
);

const PaymentMethodCard = ({ name, icon: Icon, color, number, isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    className={`relative p-5 rounded-xl border cursor-pointer transition-all ${
      isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] bg-[var(--color-input)] hover:border-[var(--color-primary)]/30"
    }`}
  >
    {isSelected && (
      <div className="absolute top-3 right-3">
        <CheckCircle className="w-4 h-4 text-[var(--color-primary)]" />
      </div>
    )}
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--color-text)]">{name}</p>
        <p className="text-[10px] text-[var(--color-muted)]">{number}</p>
      </div>
    </div>
    {isSelected && (
      <div className="mt-2 px-3 py-1 bg-[var(--color-primary)]/10 rounded-lg inline-flex">
        <span className="text-[10px] text-[var(--color-primary)] font-bold">Selected</span>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
//  MODAL WITH DEBUG PANEL
// ═══════════════════════════════════════════════════════════════════

const PayChanguModal = ({ isOpen, onClose, paymentType, amount, method, onSuccess, user }) => {
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep("processing");
    setError(null);
    setDebugInfo(null);

    try {
      const ref = generateTxRef();
      setTxRef(ref);

      const numericAmount = parseFloat(amount.replace(/[^0-9]/g, ""));

      console.log("[Payment] Initiating with:", {
        amount: numericAmount, tx_ref: ref, method, purpose: paymentType,
      });

      const data = await initiatePayment({
        amount: numericAmount,
        currency: "MWK",
        tx_ref: ref,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        method,
        purpose: paymentType,
        callback_url: CALLBACK_URL,
        return_url: RETURN_URL,
      });

      console.log("[Payment] Initiate response:", data);

      // Save debug info
      setDebugInfo(data);

      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        setStep("redirect");
        // Auto-redirect after 1.5s
        setTimeout(() => {
          console.log("[Payment] Redirecting to:", data.checkoutUrl);
          window.location.href = data.checkoutUrl;
        }, 1500);
        return;
      }

      // No checkout URL — show what we got
      setStep("no-redirect");
      onSuccess?.(ref, data);
    } catch (err) {
      console.error("[Payment] Initiate failed:", err);
      setError(err.message);
      setStep("error");
    }
  };

  const methodLabel = {
    tnm: "TNM Mpamba",
    airtel: "Airtel Money",
    bank: "Bank Transfer",
    card: "PayChangu Checkout",
  }[method] || "PayChangu";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] w-full max-w-lg rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)]">Pay via {methodLabel}</h3>
              <p className="text-[10px] text-[var(--color-muted)]">{paymentType} — {amount}</p>
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

              <button type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-primary)]/90 transition-all active:scale-[0.98]">
                <CreditCard className="w-4 h-4" />
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
                <p className="text-xs text-[var(--color-muted)] mt-1">Complete your payment on the secure checkout page</p>
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
                <p className="text-xs text-[var(--color-muted)] mt-1">PayChangu did not return a redirect link. Debug info below:</p>
              </div>

              {/* Debug Panel */}
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
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function Payment() {
  const { data: session, status } = useSession();
  const [selectedMethod, setSelectedMethod] = useState("tnm");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalMethod, setModalMethod] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [dbUser, setDbUser] = useState(null);

  const currentUser = dbUser || session?.user || null;

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const payments = await fetchPayments();
      setTransactions(payments);
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

  const handlePay = (type, amount, methodOverride = null) => {
    setModalType(type);
    setModalAmount(amount);
    setModalMethod(methodOverride || selectedMethod);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setTimeout(loadTransactions, 2000);
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <LogIn className="w-12 h-12 text-[var(--color-muted)]" />
        <p className="text-lg font-bold text-[var(--color-text)]">Please sign in to make payments</p>
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

  const paymentMethods = [
    { name: "TNM Mpamba", icon: Smartphone, color: "bg-yellow-500", number: "Mobile Money", key: "tnm" },
    { name: "Airtel Money", icon: Smartphone, color: "bg-red-500", number: "Mobile Money", key: "airtel" },
    { name: "Bank Transfer", icon: Building2, color: "bg-blue-600", number: "Direct Bank", key: "bank" },
    { name: "Card / Other", icon: CreditCard, color: "bg-purple-600", number: "PayChangu Checkout", key: "card" },
  ];

  return (
    <div className="space-y-6">
      {currentUser && (
        <div className="bg-[var(--color-card)] p-4 rounded-xl border border-[var(--color-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-text)]">{currentUser.name}</p>
            <p className="text-[10px] text-[var(--color-muted)]">
              {currentUser.email}
              {currentUser.phoneNumber && ` • ${currentUser.phoneNumber}`}
            </p>
          </div>
        </div>
      )}

      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Payments & Deposits</h2>
            <p className="text-xs text-[var(--color-muted)]">Track bidding fees, security deposits, and PayChangu transactions</p>
          </div>
          <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PaymentCard
            title="Bidding Fees" icon={CreditCard} amount="MK 5,000"
            description="Non-refundable per auction" status="Required to bid"
            statusColor="bg-[var(--color-secondary)]/10"
            onPay={() => handlePay("BIDDING_FEE", "MK 5,000")} isLoading={false}
          />
          <PaymentCard
            title="Security Deposit" icon={Wallet} amount="MK 50,000"
            description="Refundable after auction" status="Fully refundable"
            statusColor="bg-emerald-500/10 text-emerald-400"
            onPay={() => handlePay("REGISTRATION_DEPOSIT", "MK 50,000")} isLoading={false}
          />
          <PaymentCard
            title="Total Paid" icon={CheckCircle}
            amount={formatAmount(transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0))}
            description="Lifetime payments" status="PayChangu verified"
            statusColor="bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            onPay={() => {}} isLoading={false}
          />
        </div>
      </div>

      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Payment Methods</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paymentMethods.map((m) => (
            <PaymentMethodCard
              key={m.key}
              name={m.name}
              icon={m.icon}
              color={m.color}
              number={m.number}
              isSelected={selectedMethod === m.key}
              onSelect={() => setSelectedMethod(m.key)}
            />
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Recent Transactions</h2>
          <button onClick={loadTransactions} disabled={txLoading} className="p-2 rounded-lg hover:bg-[var(--color-input)]">
            <RefreshCw className={`w-4 h-4 text-[var(--color-muted)] ${txLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl">
              <p className="text-sm text-[var(--color-muted)]">No transactions yet</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const style = getMethodStyle(tx.method);
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-[var(--color-input)] rounded-xl border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${style.bg}`}>
                      <Smartphone className={`w-4 h-4 ${style.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text)]">{tx.purpose}</p>
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

      <PayChanguModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        paymentType={modalType}
        amount={modalAmount}
        method={modalMethod}
        onSuccess={handleSuccess}
        user={currentUser}
      />
    </div>
  );
}