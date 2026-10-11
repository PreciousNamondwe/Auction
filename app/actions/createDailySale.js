"use server";

import { auth } from "../../auth";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { assetImages, assets, auctionItems, dailySales } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * 🛒 DAILY SALES LISTING ENGINE (auctioneer side)
 * Creates a DAILY_SALE asset + daily sale record with a fixed buy-now price.
 */
export async function createDailySaleListing(formData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication rejected. Please sign in." };
    }

    const role = session.user.role;
    if (role !== "AUCTIONEER" && role !== "ADMIN") {
      return { success: false, error: "Only auctioneers can publish daily sale listings." };
    }

    const title = formData.get("title");
    const description = formData.get("description");
    const clientName = formData.get("clientName");
    const category = formData.get("category");
    const price = parseFloat(formData.get("price"));
    const stockCount = parseInt(formData.get("stockCount") || "1", 10);
    const rawAttributes = formData.get("dynamicAttributes");
    const parsedAttributes = JSON.parse(rawAttributes || "[]");

    if (!title || !description || !clientName || isNaN(price) || price <= 0) {
      return { success: false, error: "Title, description, client name and a valid price are required." };
    }

    const formattedAttributes = {};
    if (Array.isArray(parsedAttributes)) {
      parsedAttributes.forEach((item) => {
        if (item.key && item.key.trim() !== "") {
          formattedAttributes[item.key.trim()] = item.value;
        }
      });
    }

    const file = formData.get("assetImageFile");
    let calculatedImageUrl = "";

    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const fileExtension = path.extname(file.name);
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      const fileBytes = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileBytes);
      await fs.writeFile(filePath, fileBuffer);
      calculatedImageUrl = `/uploads/${uniqueFileName}`;
    } else {
      return { success: false, error: "Please attach a primary display image photograph." };
    }

    const result = await db.transaction(async (tx) => {
      const [newAsset] = await tx.insert(assets).values({
        title,
        description,
        location: clientName,
        clientName,
        category: category || "OTHER",
        salesType: "DAILY_SALE",
        listingType: "SALE",
        salePrice: price,
        attributes: formattedAttributes,
        documentUrl: null,
        createdById: Number(session.user.id),
      }).returning();

      const [dailySale] = await tx.insert(dailySales).values({
        assetId: newAsset.id,
        price,
        stockCount: isNaN(stockCount) ? 1 : Math.max(1, stockCount),
        isAvailable: true,
      }).returning();

      if (calculatedImageUrl) {
        // Daily sales keep their photo on a lightweight auction item shell
        // so the existing image pipeline renders them everywhere.
        const [auctionItem] = await tx.insert(auctionItems).values({
          assetId: newAsset.id,
          startingBid: price,
          reservePrice: price,
          depositAmount: 0,
          biddingFee: 0,
          endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "CLOSED",
        }).returning({ id: auctionItems.id });
        await tx.insert(assetImages).values({
          auctionItemId: auctionItem.id,
          url: calculatedImageUrl,
          isPrimary: true,
        });
      }

      return { asset: newAsset, dailySale };
    });

    return {
      success: true,
      data: {
        assetId: result.asset.id,
        dailySaleId: result.dailySale.id,
      },
    };
  } catch (error) {
    console.error("❌ Daily sale creation failure:", error);
    return { success: false, error: error.message || "Failed to publish daily sale listing." };
  }
}

/**
 * Toggle availability of a daily sale (sell out / restock).
 */
export async function toggleDailySaleAvailability(dailySaleId, isAvailable) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "AUCTIONEER" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized." };
    }

    const [updated] = await db.update(dailySales)
      .set({ isAvailable: Boolean(isAvailable) })
      .where(eq(dailySales.id, Number(dailySaleId)))
      .returning({ id: dailySales.id, isAvailable: dailySales.isAvailable });

    return { success: true, data: { id: updated.id, isAvailable: updated.isAvailable } };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update daily sale." };
  }
}
