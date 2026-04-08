import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: process.env.EMAIL_FROM ?? "hello@cubbyapp.com",
    }),
  ],
  pages: {
    signIn: "/onboarding",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, redirect to onboarding if new user, else home
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
});
