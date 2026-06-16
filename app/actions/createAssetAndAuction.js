"use server";

import { auth } from "../../auth";
import fs from "fs/promises";
import path from "path";

// 🎯 FIX: Import your globally persistent singleton instance to stop connection corruption 
import { prisma } from "@/lib/prisma";

export async function createAssetAndAuction(formData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Authentication rejected. Please sign in.");
    }

    const title = formData.get("title");
    const description = formData.get("description");
    const location = formData.get("location");
    const category = formData.get("category");
    const documentUrl = formData.get("documentUrl");
    const startingBid = formData.get("startingBid");
    const reservePrice = formData.get("reservePrice");
    const depositAmount = formData.get("depositAmount");
    
    const rawAttributes = formData.get("dynamicAttributes");
    const parsedAttributes = JSON.parse(rawAttributes || "[]");

    const formattedAttributes = {};
    if (Array.isArray(parsedAttributes)) {
      parsedAttributes.forEach(item => {
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
      throw new Error("No image file captured.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const newAsset = await tx.asset.create({
        data: {
          title,
          description,
          location,
          category,
          attributes: formattedAttributes,
          documentUrl: documentUrl || null,
          createdById: Number(session.user.id),
        }
      });

      const newAuctionItem = await tx.auctionItem.create({
        data: {
          assetId: newAsset.id,
          startingBid: parseFloat(startingBid),
          reservePrice: parseFloat(reservePrice),
          depositAmount: parseFloat(depositAmount),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), 
          status: "UPCOMING",
          
          images: {
            create: {
              url: calculatedImageUrl,
              isPrimary: true
            }
          }
        }
      });

      return { asset: newAsset, auctionItem: newAuctionItem };
    });

    // 🎯 FIX: Sanitize the network payloads completely here before crossing the server boundary
    const serializedData = {
      asset: result.asset ? {
        ...result.asset,
        createdAt: result.asset.createdAt.toISOString(),
        updatedAt: result.asset.updatedAt.toISOString(),
      } : null,
      auctionItem: result.auctionItem ? {
        ...result.auctionItem,
        // Pull Decimal types safely into standard primitive floats / numbers
        startingBid: Number(result.auctionItem.startingBid),
        reservePrice: Number(result.auctionItem.reservePrice),
        depositAmount: Number(result.auctionItem.depositAmount),
        // Coerce Date objects to explicit plain strings
        startTime: result.auctionItem.startTime.toISOString(),
        endTime: result.auctionItem.endTime.toISOString(),
        createdAt: result.auctionItem.createdAt.toISOString(),
        updatedAt: result.auctionItem.updatedAt.toISOString(),
      } : null
    };

    // Return the clean, lightweight, native object to your Client Component layout safely!
    return { success: true, data: serializedData };

  } catch (error) {
    console.error("❌ Action Failure:", error);
    throw new Error(error.message || "Failed to finalize database updates.");
  }
}