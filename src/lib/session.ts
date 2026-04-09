import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET ?? "fallback-secret";
const COOKIE = "cubby-session";

function sign(payload: string): string {
  const hmac = createHmac("sha256", SECRET);
  hmac.update(payload);
  return hmac.digest("hex");
}

export async function createSession(userId: string, email: string): Promise<string> {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ userId, email, expires });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

export async function getSession(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expected = sign(b64);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (Date.now() > payload.expires) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
