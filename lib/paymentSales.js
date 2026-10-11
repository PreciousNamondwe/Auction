import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, dailySales, sales } from "@/lib/db/schema";

export async function syncListingSalePayment(paymentRef, paymentStatus) {
  const status = paymentStatus === "completed" ? "PAID" : paymentStatus === "failed" ? "FAILED" : "PENDING";
  if (status === "PENDING") return;

  await db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(sales)
      .where(and(eq(sales.paymentRef, paymentRef), eq(sales.status, "PENDING")))
      .limit(1);
    if (!purchase) return;

    await tx.update(sales).set({
      status,
      paidAt: status === "PAID" ? new Date() : null,
    }).where(and(eq(sales.id, purchase.id), eq(sales.status, "PENDING")));

    if (purchase.dailySaleId) {
      if (status === "FAILED") {
        const [listing] = await tx.select({ stockCount: dailySales.stockCount }).from(dailySales)
          .where(eq(dailySales.id, purchase.dailySaleId)).limit(1);
        if (listing) {
          await tx.update(dailySales).set({
            stockCount: listing.stockCount + purchase.quantity,
            isAvailable: true,
          }).where(eq(dailySales.id, purchase.dailySaleId));
        }
      }
    } else if (status === "PAID") {
      await tx.update(assets).set({ isSold: true }).where(eq(assets.id, purchase.assetId));
    }
  });
}
