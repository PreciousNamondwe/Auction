"use server";

import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { auth } from "../../auth";

export async function createAsset(payload) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Authentication rejected. Log in to register assets.");
    }

    // build out dynamic specs strictly inside your dynamic schema attributes column 
    const dynamicAttributes = {};
    if (payload.category === "VEHICLE") {
      dynamicAttributes.mileage = payload.mileage || "N/A";
      dynamicAttributes.engine = payload.engine || "N/A";
      dynamicAttributes.transmission = payload.transmission || "Automatic";
    } else if (payload.category === "REAL_ESTATE") {
      dynamicAttributes.bedrooms = payload.bedrooms ? parseInt(payload.bedrooms, 10) : 0;
      dynamicAttributes.bathrooms = payload.bathrooms ? parseInt(payload.bathrooms, 10) : 0;
    } else if (payload.category === "ELECTRONICS") {
      dynamicAttributes.ram = payload.ram || "N/A";
      dynamicAttributes.storage = payload.storage || "N/A";
    }

    const [newAsset] = await db.insert(assets).values({
      title: payload.title,
      description: payload.description,
      location: payload.location,
      category: payload.category || "OTHER",
      attributes: dynamicAttributes,
      documentUrl: payload.documentUrl || null,
      createdById: Number(session.user.id),
    }).returning();

    return { success: true, asset: newAsset };
  } catch (error) {
    console.error("❌ Failed to push dynamic asset architecture to DB:", error);
    throw new Error(error.message || "Database execution failed.");
  }
}