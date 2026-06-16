"use client";

import React, { useState } from "react";
import { Mail, Lock, User, Phone, Building2, Gavel } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react"; // Import client handler

export default function SignUpPage() {
  const [role, setRole] = useState("BIDDER");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  // Handles text credential tracking
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles standard MySQL database email/password submissions
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role })
      });

      if (response.ok) {
        // Automatically redirect to login or dashboard
        window.location.href = "/login";
      } else {
        const err = await response.json();
        alert(err.message || "Registration failed");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        
        {/* Branding & Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trust Auctioneers</h1>
          <p className="text-sm text-slate-500 mt-1">Create an account to start bidding on verified properties</p>
        </div>

        {/* Professional Role Selection Toggle */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole("BIDDER")}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              role === "BIDDER"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gavel className="w-4 h-4" />
            I am a Bidder
          </button>
          <button
            type="button"
            onClick={() => setRole("AUCTIONEER")}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              role === "AUCTIONEER"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Auctioneer / Agent
          </button>
        </div>

        {/* Input Form */}
        <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@example.com" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+265 888 123 456" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-3 shadow-lg shadow-blue-100 transition-colors mt-2"
          >
            Create {role === "BIDDER" ? "Bidder" : "Auctioneer"} Account
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <span className="relative bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Or register with</span>
        </div>

        {/* Custom Google Button hooked into Auth.js Router */}
        <button 
          type="button" 
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl py-2.5 transition-all"
        >
          <Image 
            src="/google.svg" 
            alt="Google Logo" 
            width={18} 
            height={18} 
            priority
          />
          Continue with Google
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">Log in</Link>
        </p>

      </div>
    </div>
  );
}