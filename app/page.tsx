import React from "react";
import Link from "next/link";
import { 
  Gavel, 
  ShieldCheck, 
  Building2, 
  Search, 
  ArrowRight, 
  MapPin, 
  Landmark, 
  Clock, 
  TrendingUp, 
  Layers, 
  ArrowUpRight, 
  ShieldAlert,
  Compass,
  HelpCircle,
  Maximize2,
  Sliders,
  DollarSign,
  Activity
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#EBEBEF] font-sans antialiased text-[#1A1A1E] flex flex-col select-none">
      
      {/* 1. TOP GLOBAL APP HEADER BANNER */}
      <header className="w-full h-16 px-6 bg-[#FAF9FB] border-b border-[#D8D8DC] flex items-center justify-between sticky top-0 z-50 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1A1A1E] rounded-xl flex items-center justify-center text-white shadow-sm">
            <Gavel className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1E] block">Trust Terminal</span>
            <span className="text-[9px] text-[#5D5D62] uppercase tracking-widest font-bold -mt-1 block">Institutional Real Estate Hub</span>
          </div>
        </div>

        {/* Global Live Filter Tabs */}
        <nav className="hidden md:flex items-center p-0.5 bg-[#EBEBEF] rounded-full border border-[#D8D8DC]">
          <a href="#active-lots" className="px-4 py-1.5 bg-[#FAF9FB] text-[#1A1A1E] text-2xs font-bold rounded-full shadow-2xs tracking-wide">Live Lots</a>
          <a href="#how-it-works" className="px-4 py-1.5 text-[#5D5D62] text-2xs font-bold rounded-full hover:text-[#1A1A1E] tracking-wide">Escrow Rules</a>
          <a href="#compliance" className="px-4 py-1.5 text-[#5D5D62] text-2xs font-bold rounded-full hover:text-[#1A1A1E] tracking-wide">Regulatory Audits</a>
        </nav>

        {/* Location & Secure System Action Nodes */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#EBEBEF] rounded-lg text-2xs font-bold tracking-wide text-[#5D5D62]">
            <MapPin className="w-3.5 h-3.5 text-[#1A1A1E]" />
            <span>Region: <span className="text-[#1A1A1E]">Blantyre Core</span></span>
          </div>
          <Link href="/login" className="text-2xs font-bold uppercase tracking-wider text-[#5D5D62] hover:text-[#1A1A1E] transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="px-3 py-2 bg-[#1A1A1E] hover:bg-[#1A1A1E]/90 text-white text-2xs font-bold rounded-lg shadow-sm transition-all tracking-wide">
            Open Escrow Node
          </Link>
        </div>
      </header>

      {/* 2. CORE FULL-SCREEN SIDEBAR + DATA FRAME WORKSPACE */}
      <div className="flex-1 flex items-stretch">
        
        {/* LEFT COMPACT UTILITY RAIL */}
        <aside className="hidden md:flex w-16 bg-[#FAF9FB] border-r border-[#D8D8DC] flex-col items-center justify-between py-6 shrink-0">
          <div className="flex flex-col gap-4 items-center">
            <button className="w-10 h-10 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-[#1A1A1E] border border-white/40 shadow-2xs">
              <Compass className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 bg-transparent hover:bg-[#EBEBEF]/50 rounded-lg flex items-center justify-center text-[#5D5D62] hover:text-[#1A1A1E] transition-colors">
              <Layers className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 bg-transparent hover:bg-[#EBEBEF]/50 rounded-lg flex items-center justify-center text-[#5D5D62] hover:text-[#1A1A1E] transition-colors">
              <Sliders className="w-4 h-4" />
            </button>
          </div>
          <button className="w-10 h-10 bg-transparent hover:bg-[#EBEBEF]/50 rounded-lg flex items-center justify-center text-[#5D5D62]">
            <HelpCircle className="w-4 h-4" />
          </button>
        </aside>

        {/* MAIN FULL-PAGE WORKSPACE CONTENT GRID */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
          
          {/* TOP GRID BLOCK: LANDING SUMMARY & ACTIVE CAMPAIGN TARGET */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Primary Promotional Display Statement */}
            <div className="lg:col-span-7 bg-[#FAF9FB] border border-[#D8D8DC] p-8 rounded-2xl shadow-2xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#1A1A1E] text-[#FAF9FB] rounded-md text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> High-Asset Real Estate Registry
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1A1A1E] tracking-tight leading-[0.95]">
                  Transparent & <br />
                  Deed-Verified <br />
                  <span className="text-blue-700">Digital Auctions.</span>
                </h1>
                <p className="text-xs font-semibold text-[#5D5D62] max-w-xl leading-relaxed pt-2">
                  The primary electronic exchange for high-end properties. Enter a verified ecosystem processing multi-hectare development plots, commercial complexes, and private holdings under absolute cryptographic and legal transparency.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-6">
                <a href="#active-lots" className="inline-flex items-center gap-2 bg-[#1A1A1E] text-white font-black text-xs rounded-xl px-5 py-3.5 shadow-sm hover:bg-[#1A1A1E]/90 transition-all">
                  Access Real-Time Terminal <Search className="w-3.5 h-3.5" />
                </a>
                <a href="#how-it-works" className="inline-flex items-center gap-2 bg-[#EBEBEF] border border-[#D8D8DC] text-[#1A1A1E] font-black text-xs rounded-xl px-5 py-3.5 shadow-2xs hover:bg-[#D8D8DC]/50 transition-all">
                  Escrow Rules & Verification <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Featured Lot Display Segment */}
            <div className="lg:col-span-5 bg-[#FAF9FB] border border-[#D8D8DC] p-6 rounded-2xl shadow-2xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8D8DC]/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-[#1A1A1E]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-[#5D5D62] uppercase tracking-wider block">Lot Reference Identifier</span>
                    <h4 className="text-xs font-black text-[#1A1A1E] uppercase">Namiwawa Commercial Lot 4A</h4>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black rounded uppercase tracking-wide">
                  Active Run
                </span>
              </div>

              {/* Graphical Asset Placeholder Frame */}
              <div className="h-44 bg-gradient-to-br from-[#E1E1E6] to-[#C8C8CC] rounded-xl border border-white/40 flex items-center justify-center relative overflow-hidden group shadow-inner">
                <div className="absolute top-3 left-3 bg-[#1A1A1E]/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Clock className="w-3 h-3 text-amber-400" /> 04d : 12h : 31m
                </div>
                <button className="absolute top-3 right-3 p-1.5 bg-[#FAF9FB] rounded-lg border border-[#D8D8DC] text-[#5D5D62] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Maximize2 className="w-3 h-3" />
                </button>
                <Landmark className="w-12 h-12 text-[#A8A8AF]/40 group-hover:scale-105 transition-transform duration-700" />
              </div>

              {/* Asset Financial Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-[#EBEBEF]/50 p-3 rounded-xl border border-[#D8D8DC]/40">
                <div>
                  <span className="text-[9px] text-[#5D5D62] uppercase font-bold tracking-wider block">Reserve Threshold</span>
                  <p className="font-black text-[#1A1A1E]">MWK 120,000,000</p>
                </div>
                <div>
                  <span className="text-[9px] text-[#5D5D62] uppercase font-bold tracking-wider block">Required Clearing Escrow</span>
                  <p className="font-black text-blue-700">MWK 5,000,000</p>
                </div>
              </div>

              <Link href="/signup" className="w-full py-3 bg-[#1A1A1E] hover:bg-[#1A1A1E]/90 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm tracking-wide">
                Clear Escrow To Place Bid <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

          {/* SECOND GRID BLOCK: ACTIVE PLATFORM MARKETPLACE ITEMS LOTS */}
          <section id="active-lots" className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-[#D8D8DC] pb-2">
              <h3 className="text-xs font-black text-[#1A1A1E] uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-700" /> Real-Time Node Exchange Feed (`AuctionItem[]`)
              </h3>
              <span className="text-[10px] font-bold text-[#5D5D62] uppercase bg-[#FAF9FB] border border-[#D8D8DC] px-2.5 py-0.5 rounded-md">
                Stream Active
              </span>
            </div>

            {/* Global Continuous Lot Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Lot Entry Node 1 */}
              <div className="bg-[#FAF9FB] border border-[#D8D8DC] p-5 rounded-xl shadow-2xs space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[9px] font-black text-[#5D5D62] uppercase">Plot 11B &bull; Land Asset</span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-100">Upcoming</span>
                </div>
                <div className="h-28 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-[#5D5D62]">
                  <span className="text-2xs font-bold uppercase tracking-wider">Map Overlay Preview</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-[#5D5D62] uppercase block">Starting Value</span>
                    <p className="font-black text-[#1A1A1E]">MWK 34,000,000</p>
                  </div>
                  <button className="px-3 py-1.5 bg-[#EBEBEF] text-[#1A1A1E] text-2xs font-bold rounded-lg border border-[#D8D8DC] hover:bg-[#D8D8DC]">Lot Specifications</button>
                </div>
              </div>

              {/* Lot Entry Node 2 */}
              <div className="bg-[#FAF9FB] border border-[#D8D8DC] p-5 rounded-xl shadow-2xs space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[9px] font-black text-[#5D5D62] uppercase">Soche High-Density Office</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-100">Active</span>
                </div>
                <div className="h-28 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-[#5D5D62]">
                  <span className="text-2xs font-bold uppercase tracking-wider">Structural Image Array</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-[#5D5D62] uppercase block">Current Bid Metric</span>
                    <p className="font-black text-emerald-600">MWK 89,500,000</p>
                  </div>
                  <button className="px-3 py-1.5 bg-[#1A1A1E] text-white text-2xs font-bold rounded-lg shadow-sm hover:bg-[#1A1A1E]/90">Bid Terminal</button>
                </div>
              </div>

              {/* Lot Entry Node 3 */}
              <div className="bg-[#FAF9FB] border border-[#D8D8DC] p-5 rounded-xl shadow-2xs space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[9px] font-black text-[#5D5D62] uppercase">Limbe Industrial Unit 2</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-100">Active</span>
                </div>
                <div className="h-28 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-[#5D5D62]">
                  <span className="text-2xs font-bold uppercase tracking-wider">Facility Interior Spec</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <div>
                    <span className="text-[9px] text-[#5D5D62] uppercase block">Current Bid Metric</span>
                    <p className="font-black text-emerald-600">MWK 210,000,000</p>
                  </div>
                  <button className="px-3 py-1.5 bg-[#1A1A1E] text-white text-2xs font-bold rounded-lg shadow-sm hover:bg-[#1A1A1E]/90">Bid Terminal</button>
                </div>
              </div>

            </div>
          </section>

          {/* THIRD GRID BLOCK: CORE OPERATIONAL STATEMENTS (Pillars) */}
          <section id="how-it-works" className="space-y-4 pt-2">
            <div className="border-b border-[#D8D8DC] pb-2">
              <h3 className="text-xs font-black text-[#1A1A1E] uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Back-End Architecture & Security Frameworks
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#FAF9FB] border border-[#D8D8DC] p-6 rounded-xl flex flex-col justify-between space-y-4 shadow-3xs">
                <div className="w-8 h-8 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-[#1A1A1E] border border-white/50">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1A1A1E] uppercase tracking-wider mb-1">Legal Deed Aggregation</h4>
                  <p className="text-[11px] text-[#5D5D62] leading-relaxed font-semibold">
                    Every asset record enforces a valid, verified digital Title Deed string directly mapped within our MariaDB relational core before deployment to the live auction engine.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF9FB] border border-[#D8D8DC] p-6 rounded-xl flex flex-col justify-between space-y-4 shadow-3xs">
                <div className="w-8 h-8 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-blue-700 border border-white/50">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1A1A1E] uppercase tracking-wider mb-1">Protected Bidding Tiers</h4>
                  <p className="text-[11px] text-[#5D5D62] leading-relaxed font-semibold">
                    Prevents speculative market distortions by requiring users to settle a refundable system deposit route through integrated local PayChangu escrow loops prior to lot clearance.
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF9FB] border border-[#D8D8DC] p-6 rounded-xl flex flex-col justify-between space-y-4 shadow-3xs">
                <div className="w-8 h-8 bg-[#EBEBEF] rounded-lg flex items-center justify-center text-emerald-600 border border-white/50">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1A1A1E] uppercase tracking-wider mb-1">Optimized Execution Nodes</h4>
                  <p className="text-[11px] text-[#5D5D62] leading-relaxed font-semibold">
                    The background schema uses composite index layers `[auctionItemId, amount(desc)]` ensuring live leader updates and processing workflows resolve with zero latency.
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* COMPLIANCE TELEMETRY STATUS ROW */}
          <div id="compliance" className="bg-[#1A1A1E] text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Malawi Financial Intelligence Unit Regulatory Guard</p>
                <p className="text-[10px] text-[#A8A8AF]">All execution protocols are cataloged under verified AML frameworks and anti-speculation asset validation protocols.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-mono tracking-wider bg-white/5 px-4 py-2 rounded-lg border border-white/5 w-full sm:w-auto justify-around sm:justify-start">
              <div><span className="text-[#A8A8AF]">MARIADB_POOL:</span> <span className="text-emerald-400 font-bold">READY</span></div>
              <div><span className="text-[#A8A8AF]">ESCROW_GATE:</span> <span className="text-blue-400 font-bold">ACTIVE</span></div>
            </div>
          </div>

        </main>
      </div>

      {/* 3. APP FOOTER STATUS STRIP */}
      <footer className="w-full h-10 px-6 bg-[#FAF9FB] border-t border-[#D8D8DC] flex items-center justify-between text-[10px] font-bold text-[#5D5D62] uppercase tracking-widest shrink-0">
        <span>&copy; {new Date().getFullYear()} Trust Auctioneers Platform Core Matrix</span>
        <span>Engineered with Next.js Engine & MySQL Architecture Frameworks</span>
      </footer>

    </div>
  );
}