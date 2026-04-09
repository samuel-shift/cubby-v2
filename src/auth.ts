import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers: [
    // ── No-verification email login (dev/beta) ──────────────────────────
    Credentials({
      id: "email-no-verify",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.toLowerCase().trim();
        if (!email || !email.includes("@")) return null;

        // Find or create user
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email },
          });
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Magic link email (coming soon)
    Resend({
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    }),
    // Google OAuth (coming soon)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/onboarding",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding",
  },
  callbacks: {
    session({ session, user, token }) {
      if (user) {
        session.user.id = user.id;
      } else if (token) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/`;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
});
