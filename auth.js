import Google from "next-auth/providers/google";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } }
    }),
    Credentials({
      name: "credentials",
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);

        if (!user?.password?.startsWith("$2")) return null;
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) return null;

        return {
          id: String(user.id), 
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;

      const [existingUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
      if (existingUser) return true;

      await db.insert(users).values({
        name: user.name || user.email,
        email: user.email,
        password: `oauth:${randomUUID()}`,
        phoneNumber: "",
        isVerified: true,
      }).onConflictDoNothing({ target: users.email });

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id; 
        token.role = user.role;
      }

      if (account?.provider === "google" && token.email) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, token.email)).limit(1);
        if (dbUser) {
          token.id = String(dbUser.id);
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

// Do not call `NextAuth` at module load time. Route handlers should create
// a fresh NextAuth instance in the route to avoid side effects during build.
// Provide a lazy `auth` helper that's created at call time to avoid
// executing NextAuth during module import (prevents build-time side effects).
export async function auth(...args) {
  const { auth: authFn } = NextAuth(authConfig);
  return authFn(...args);
}

export default authConfig;