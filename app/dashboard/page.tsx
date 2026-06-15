import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  ShieldCheck, 
  LogOut, 
  Gavel, 
  Building2, 
  PlusCircle, 
  Calendar, 
  UserCheck, 
  Wallet, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  // 1. Fetch the secure server-side session token
  const session = await auth();

  // 2. Route Guard: Force unauthenticated sessions back to the login terminal
  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user;
  
  // 3. Conditional role evaluation matching your exact Prisma Schema Enum strings
  const isAuctioneer = user.role === "AUCTIONEER";
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Dynamic Professional Context Top Banner */}
      <div className={`w-full p-6 text-white bg-gradient-to-r ${
        isAuctioneer ? "from-indigo-600 to-slate-900" : "from-blue-600 to-indigo-700"
      } shadow-md`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <Gavel className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Trust Auctioneers Terminal</h1>
              <p className="text-xs text-blue-100 mt-0.5">
                {isAuctioneer ? "Real Estate Listing & Campaign Operations Desk" : "Bidder Asset Monitor Hub"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-center">
            <Link
              href="/api/auth/signout"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-red-600 rounded-xl transition-all border border-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Core Schema Profile Identity Block */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Identity Verification
            </h3>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div className="flex items-start gap-3">
                <UserIcon className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400">Account Name</label>
                  <p className="text-sm font-semibold text-slate-800">{user.name || "N/A"}</p>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <p className="text-sm font-medium text-slate-600 break-all">{user.email}</p>
                </div>
              </div>

              {/* Secure App Role Badge */}
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                <div>
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400">System Role</label>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-2xs font-bold uppercase tracking-wide mt-1 border ${
                    isAuctioneer 
                      ? "bg-purple-50 text-purple-700 border-purple-100" 
                      : "bg-blue-50 text-blue-700 border-blue-100"
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Internal Route Backing */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link href="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1">
                &larr; Return to Live Marketplace
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contextual Functions Based On User Schema Role */}
        <div className="lg:col-span-2 space-y-6">
          
          {isAuctioneer ? (
            /* ==================================================================== */
            /* AUCTIONEER SUB-DASHBOARD (Maps to Properties, AuctionItems, Regulations) */
            /* ==================================================================== */
            <>
              {/* Grid Actions Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/properties/new" className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 transition-all flex items-start gap-4 group">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      1. Register Property <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Add legal asset descriptors, property metrics, and upload Title Deeds validation models.</p>
                  </div>
                </Link>

                <Link href="/auctions/create" className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-500 transition-all flex items-start gap-4 group">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      2. Launch Auction Lot <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Map properties to active windows. Enforce Reserve values, Starting thresholds, and Security Deposits.</p>
                  </div>
                </Link>
              </div>

              {/* Module Management Hub Framework Panels */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Prisma Schema Operations Panel</h3>
                    <p className="text-2xs text-slate-500 mt-0.5">Vetting tools aligned with your data entity relations.</p>
                  </div>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="divide-y divide-slate-100 text-sm">
                  {/* Property Inventory Audit Block */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 text-xs sm:text-sm">My Registered Inventories (`Property[]` Relations)</p>
                        <p className="text-2xs text-slate-400 mt-0.5">Audits verified deeds status documents uploaded to local cloud storage blocks.</p>
                      </div>
                    </div>
                    <Link href="/dashboard/properties" className="px-3 py-1 text-2xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center">
                      Manage Real Estate ({user.id ? "View Lots" : "0"})
                    </Link>
                  </div>

                  {/* Bidder Verification Vetting Block */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <UserCheck className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 text-xs sm:text-sm">Vet Registrations (`AuctionRegistration[]` Queue)</p>
                        <p className="text-2xs text-slate-400 mt-0.5">Approve or reject pending bidders based on verified transaction escrow clearances.</p>
                      </div>
                    </div>
                    <Link href="/dashboard/registrations" className="px-3 py-1 text-2xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center">
                      Review Pending Approvals
                    </Link>
                  </div>

                  {/* Active Campaigns Monitoring Stream */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 text-xs sm:text-sm">Live Campaign Monitors (`AuctionItem[]` Scope)</p>
                        <p className="text-2xs text-slate-400 mt-0.5">Tracks ticking clocks, bid increment velocities, and automatically evaluates reserve metrics.</p>
                      </div>
                    </div>
                    <Link href="/dashboard/campaigns" className="px-3 py-1 text-2xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center">
                      Track Live Bids
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ==================================================================== */
            /* BIDDER SUB-DASHBOARD (Maps to Bids, Registrations, Payments Gateways) */
            /* ==================================================================== */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">My Active Bidding Portfolio</h3>
                  <p className="text-2xs text-slate-500 mt-0.5">Track your legal bids, security deposits, and processing invoices.</p>
                </div>
                <Wallet className="w-4 h-4 text-slate-400" />
              </div>

              <div className="divide-y divide-slate-100 text-sm">
                {/* Placed Bids Tracker Block */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Gavel className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">My Active Placed Bids (`Bid[]` Relations)</p>
                      <p className="text-2xs text-slate-400 mt-0.5">Review current positions, increment records, and winning parameters.</p>
                    </div>
                  </div>
                  <Link href="/dashboard/my-bids" className="px-3 py-1 text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center">
                    View Placed Bids
                  </Link>
                </div>

                {/* Vetting Status Access Block */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">Registered Assets (`AuctionRegistration[]` Status)</p>
                      <p className="text-2xs text-slate-400 mt-0.5">Track whether auctioneers have approved your entry into specific property lots.</p>
                    </div>
                  </div>
                  <Link href="/dashboard/my-registrations" className="px-3 py-1 text-2xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center">
                    Check Lot Access
                  </Link>
                </div>

                {/* Transaction Receipts Ledger Block */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">PayChangu Invoices Pool (`Payment[]` Receipts)</p>
                      <p className="text-2xs text-slate-400 mt-0.5">Download transaction reference ledgers for escrow downpayments and absolute purchases.</p>
                    </div>
                  </div>
                  <Link href="/dashboard/payments" className="px-3 py-1 text-2xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center">
                    Ledger Statements
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}