import NextAuth from "next-auth";
import { authConfig } from "../../../../auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { Adapter } from "next-auth/adapters";
import { NextRequest } from "next/server";

async function handler(req: NextRequest, ctx: any) {
  const connectionString = process.env.DATABASE_URL || "mysql://root:root@127.0.0.1:3306/e-auction";
  const dbUrl = new URL(connectionString);

  const dbAdapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || "3306", 10),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace("/", ""),
  });

  const prisma = new PrismaClient({ adapter: dbAdapter });

  const { handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as Adapter,
  });

  // FIXED: Explicitly casting handlers to 'any' allows passing the Next.js execution context parameter cleanly
  if (req.method === "GET") {
    return await (handlers.GET as any)(req, ctx);
  } else {
    return await (handlers.POST as any)(req, ctx);
  }
}

export { handler as GET, handler as POST };