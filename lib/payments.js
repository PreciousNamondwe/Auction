// ═══════════════════════════════════════════════════════════════════
//  PAYMENTS LIB — All business logic lives here
// ═══════════════════════════════════════════════════════════════════

const API = {
  initiate: "/api/paychangu/initiate",
  list: "/api/payments",
  user: "/api/user/me",
  status: "/api/paychangu/status",
};

/**
 * Initiate a PayChangu payment via secure server route
 */
export async function initiatePayment(payload) {
  const res = await fetch(API.initiate, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Payment initiation failed");
  return data;
}

/**
 * Fetch current user's payment history
 */
export async function fetchPayments() {
  const res = await fetch(API.list);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load transactions");
  return data.payments || [];
}

export async function updatePayment(reference, changes) {
  const res = await fetch(`${API.list}/${encodeURIComponent(reference)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update payment");
  return data.payment;
}

export async function deletePayment(reference) {
  const res = await fetch(`${API.list}/${encodeURIComponent(reference)}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete payment");
  return data;
}

/**
 * Fetch full user profile from DB (includes phoneNumber)
 */
export async function fetchUserProfile() {
  const res = await fetch(API.user);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load profile");
  return data.user;
}

/**
 * Check payment status by tx_ref
 */
export async function checkPaymentStatus(tx_ref) {
  const res = await fetch(`${API.status}?tx_ref=${tx_ref}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Status check failed");
  return data;
}

/**
 * Generate unique transaction reference
 */
export function generateTxRef() {
  return `BID265-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Format amount to Malawian Kwacha string
 */
export function formatAmount(amount) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "MK 0";
  return `MK ${num.toLocaleString()}`;
}

/**
 * Format ISO date to readable string
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Split full name into first / last
 */
export function parseName(fullName = "") {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

/**
 * Status color mapping for UI
 */
export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "success":
      return "text-emerald-400";
    case "pending":
      return "text-yellow-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-[var(--color-muted)]";
  }
}

/**
 * Method icon/bg mapping for UI
 */
export function getMethodStyle(method) {
  const m = method?.toLowerCase() || "";
  if (m.includes("tnm")) return { bg: "bg-yellow-500/20", text: "text-yellow-500" };
  if (m.includes("airtel")) return { bg: "bg-red-500/20", text: "text-red-500" };
  if (m.includes("bank")) return { bg: "bg-blue-600/20", text: "text-blue-500" };
  return { bg: "bg-purple-600/20", text: "text-purple-500" };
}