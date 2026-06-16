// lib/prisma.js
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.trim() === "") {
    console.error("❌ [Prisma Config Error]: DATABASE_URL environment variable is missing or empty.");
    return null;
  }

  try {
    // Attempt standard instantiation
    return new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // Optional: Log queries/errors directly in terminal for debugging
      log: ["error", "warn"], 
    });
  } catch (error) {
    console.error("❌ [Prisma Initialization Crash]: Failed to construct PrismaClient instance.");
    console.error(error);
    return null;
  }
};

const globalForPrisma = globalThis;

// Initialize inside a safe wrapper
let activePrismaInstance = globalForPrisma.prisma ?? prismaClientSingleton();

// If initialization failed, create a safe Proxy to catch runtime query attempts gracefully
if (!activePrismaInstance) {
  activePrismaInstance = new Proxy({}, {
    get: function(_, prop) {
      return async function() {
        throw new Error(
          `🚨 Database Operation Blocked: Cannot execute '.${prop}()' because PrismaClient failed to initialize. Check your server terminal logs.`
        );
      };
    }
  });
}

export const prisma = activePrismaInstance;

if (process.env.NODE_ENV !== "production" && !globalForPrisma.prisma) {
  globalForPrisma.prisma = activePrismaInstance;
}