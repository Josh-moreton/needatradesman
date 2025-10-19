import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import type { UserRole } from "@prisma/client";

// Extend NextAuth types to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      onboardingComplete: boolean;
      stripeAccountId?: string | null;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: UserRole;
    onboardingComplete: boolean;
    stripeAccountId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM || "Need A Tradesman <noreply@needatradesman.co.uk>",
      maxAge: 10 * 60, // Magic links valid for 10 minutes
    }),
    // Google OAuth (optional - only if credentials are configured)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      // Enrich session from database (our source of truth for authorization)
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role as UserRole;
        session.user.onboardingComplete = user.onboardingComplete as boolean;
        session.user.stripeAccountId = user.stripeAccountId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    signOut: "/",
    error: "/signin",
    verifyRequest: "/signin/verify",
  },
});
