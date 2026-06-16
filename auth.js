import Google from "next-auth/providers/google";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

// Global declaration to prevent open database handle leaks during Next.js Hot Reloads
const globalForPrisma = globalThis;

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

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

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const authConfig = {
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

        const prisma = getPrismaClient();

        // Query the user table securely
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // Verify user presence and password match safely
        if (!user || !user.password) return null;
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) return null;

        return {
          id: String(user.id), 
          email: user.email,
          name: user.name,
          role: user.role, // Passed directly into the initial JWT token execution
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      const prisma = getPrismaClient();

      // 1. Initial Login Event Handlers
      if (user) {
        token.id = user.id; 
        token.role = user.role;
      }

      // 2. Social Sign-In Safeguard (Google Oauth doesn't execute authorize method)
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email }
        });
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

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);