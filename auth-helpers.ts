/**
 * Shared auth helper for API routes.
 *
 * Returns the authenticated user's ID, or — if no session exists —
 * auto-creates / retrieves a deterministic "demo" user so the app
 * works without sign-in during development and demos.
 *
 * The demo user has a stable ID derived from a fixed email so all
 * data persists across requests within the same environment.
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@cubbyapp.local";

export async function getRequiredUserId(): Promise<string> {
  // 1. Try real auth session first
  const session = await auth().catch(() => null);
  if (session?.user?.id) return session.user.id;

  // 2. Fall back to demo user (auto-create if needed)
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Chef",
      },
    });
  }

  return user.id;
}
