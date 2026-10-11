import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { assets, auctionAccessPayments, auctionItems, payments, sales, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }
    if (!["AUCTIONEER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Only auctioneers can view listing finance." }, { status: 403 });
    }

    const ownerId = Number(session.user.id);
    const saleRows = await db.select({
      id: sales.id,
      kind: sales.kind,
      title: assets.title,
      category: assets.category,
      amount: sales.amount,
      quantity: sales.quantity,
      buyerName: users.name,
      reference: sales.paymentRef,
      createdAt: sales.paidAt,
    }).from(sales)
      .innerJoin(assets, eq(sales.assetId, assets.id))
      .innerJoin(users, eq(sales.buyerId, users.id))
      .where(and(eq(sales.sellerId, ownerId), eq(sales.status, "PAID")))
      .orderBy(desc(sales.paidAt));

    const feeRows = await db.select({
      id: auctionAccessPayments.id,
      feeType: auctionAccessPayments.feeType,
      amount: auctionAccessPayments.amount,
      buyerName: users.name,
      title: assets.title,
      reference: auctionAccessPayments.paymentRef,
      createdAt: auctionAccessPayments.paidAt,
    }).from(auctionAccessPayments)
      .innerJoin(auctionItems, eq(auctionAccessPayments.auctionItemId, auctionItems.id))
      .innerJoin(assets, eq(auctionItems.assetId, assets.id))
      .innerJoin(users, eq(auctionAccessPayments.userId, users.id))
      .innerJoin(payments, eq(auctionAccessPayments.paymentRef, payments.reference))
      .where(and(
        eq(assets.createdById, ownerId),
        eq(auctionAccessPayments.status, "PAID"),
        eq(payments.gatewayStatus, "completed"),
      ))
      .orderBy(desc(auctionAccessPayments.paidAt));

    const saleTransactions = saleRows.map((row) => ({
      id: `sale-${row.id}`,
      type: row.kind === "PROPERTY_PURCHASE" ? "Property sale" : "Daily sale",
      title: row.title,
      category: row.category,
      amount: Number(row.amount),
      quantity: row.quantity,
      buyerName: row.buyerName,
      reference: row.reference,
      createdAt: row.createdAt?.toISOString() || null,
    }));
    const feeTransactions = feeRows.map((row) => ({
      id: `fee-${row.id}`,
      type: row.feeType === "ENTRY_FEE"
        ? "Auction entry fee"
        : "Auction bidding funds / security deposit",
      title: row.title,
      amount: Number(row.amount),
      quantity: 1,
      buyerName: row.buyerName,
      reference: row.reference,
      createdAt: row.createdAt?.toISOString() || null,
    }));
    const transactions = [...saleTransactions, ...feeTransactions]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    const revenueFor = (type) => saleTransactions
      .filter((row) => row.type === type)
      .reduce((sum, row) => sum + row.amount, 0);
    const entryFeeRevenue = feeTransactions
      .filter((row) => row.type === "Auction entry fee")
      .reduce((sum, row) => sum + row.amount, 0);
    const biddingDepositRevenue = feeTransactions
      .filter((row) => row.type === "Auction bidding funds / security deposit")
      .reduce((sum, row) => sum + row.amount, 0);
    const dailySalesByCategory = Object.values(saleTransactions
      .filter((row) => row.type === "Daily sale")
      .reduce((groups, row) => {
        const category = row.category || "OTHER";
        const current = groups[category] || { category, quantity: 0, revenue: 0 };
        current.quantity += row.quantity;
        current.revenue += row.amount;
        groups[category] = current;
        return groups;
      }, {}))
      .sort((left, right) => right.revenue - left.revenue);
    const dailySalesByItem = Object.values(saleTransactions
      .filter((row) => row.type === "Daily sale")
      .reduce((groups, row) => {
        const key = `${row.title}:${row.category || "OTHER"}`;
        const current = groups[key] || {
          title: row.title,
          category: row.category || "OTHER",
          quantity: 0,
          revenue: 0,
        };
        current.quantity += row.quantity;
        current.revenue += row.amount;
        groups[key] = current;
        return groups;
      }, {}))
      .sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalRevenue: transactions.reduce((sum, row) => sum + row.amount, 0),
          dailySalesRevenue: revenueFor("Daily sale"),
          propertySalesRevenue: revenueFor("Property sale"),
          entryFeeRevenue,
          biddingDepositRevenue,
          auctionAccessRevenue: entryFeeRevenue + biddingDepositRevenue,
          goodsSold: saleTransactions
            .filter((row) => row.type === "Daily sale")
            .reduce((sum, row) => sum + row.quantity, 0),
          propertiesSold: saleTransactions
            .filter((row) => row.type === "Property sale")
            .reduce((sum, row) => sum + row.quantity, 0),
          dailySalesByCategory,
          dailySalesByItem,
          transactionCount: transactions.length,
        },
      },
    });
  } catch (error) {
    console.error("[Auctioneer finance]", error);
    return NextResponse.json({ error: "Could not load auctioneer finance." }, { status: 500 });
  }
}
