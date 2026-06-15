import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trust Auctioneers | Premium Real Estate E-Auction",
  description: "Secure, verified, and transparent property bidding portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.className} h-full antialiased bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}