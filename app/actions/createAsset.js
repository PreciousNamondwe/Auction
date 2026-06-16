"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { auth } from "../../auth";

const globalForPrisma = globalThis;

function getPrismaClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const connectionString = process.env.DATABASE_URL || "mysql://root:root@127.0.0.1:3306/e-auction";
  const dbUrl = new URL(connectionString);
  const dbAdapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || "3306", 10),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace("/", ""),
  });
  const client = new PrismaClient({ adapter: dbAdapter });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export async function createAsset(payload) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Authentication rejected. Log in to register assets.");
    }

    const prisma = getPrismaClient();

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

    const newAsset = await prisma.asset.create({
      data: {
        title: payload.title,
        description: payload.description,
        location: payload.location,
        assetCategory: payload.category, // REAL_ESTATE, VEHICLE, MACHINERY, ELECTRONICS, OTHER
        attributes: dynamicAttributes, // Stored as raw native JSON safely in MariaDB!
        documentUrl: payload.documentUrl || null,
        createdById: Number(session.user.id),
      },
    });

    return { success: true, asset: newAsset };
  } catch (error) {
    console.error("❌ Failed to push dynamic asset architecture to DB:", error);
    throw new Error(error.message || "Database execution failed.");
  }
}