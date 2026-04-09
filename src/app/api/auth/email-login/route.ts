/**
 * POST /api/auth/email-login
 * No-verification email login. Finds or creates user, creates a NextAuth
 * database session, and returns the session token.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalised = email?.toLowerCase().trim();
    if (!normalised || !normalised.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: normalised } });
    if (!user) {
      user = await prisma.user.create({ data: { email: normalised } });
    }

    // Create a NextAuth database session manually
    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    // Set the session cookie (NextAuth v5 uses authjs.session-token)
    const response = NextResponse.json({ ok: true });
    response.cookies.set("authjs.session-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Email login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
