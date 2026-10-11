import NextAuth from "next-auth";
import { authConfig } from "../../../../auth";

async function handler(req, ctx) {
  const { handlers } = NextAuth(authConfig);

  // JavaScript cleanly processes the dynamic Next.js execution context parameter natively
  if (req.method === "GET") {
    return await handlers.GET(req, ctx);
  } else {
    return await handlers.POST(req, ctx);
  }
}

export { handler as GET, handler as POST };