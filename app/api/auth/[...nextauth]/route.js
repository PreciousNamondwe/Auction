import NextAuth from "next-auth";
import { authConfig } from "../../../../auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

async function handler(req, ctx) {
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
    adapter: PrismaAdapter(prisma),
  });

  // JavaScript cleanly processes the dynamic Next.js execution context parameter natively
  if (req.method === "GET") {
    return await handlers.GET(req, ctx);
  } else {
    return await handlers.POST(req, ctx);
  }
}

export { handler as GET, handler as POST };