import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@cubbyapp.local";

export async function getRequiredUserId(): Promise<string> {
  const session = await auth().catch(() => null);
  if (session?.user?.id) return session.user.id;

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
