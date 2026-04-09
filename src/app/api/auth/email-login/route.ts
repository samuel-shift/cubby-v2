import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalised = email?.toLowerCase().trim();
    if (!normalised || !normalised.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email: normalised } });
    if (!user) {
      user = await prisma.user.create({ data: { email: normalised } });
    }

    const token = await createSession(user.id, user.email);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("cubby-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Email login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
