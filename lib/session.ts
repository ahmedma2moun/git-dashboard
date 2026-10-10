// Edge-compatible (Web Crypto). The GitHub token lives in an AES-GCM encrypted,
// HTTP-only cookie; SESSION_SECRET is the server-side encryption key.
export const COOKIE = "gd_session";
const MAX_AGE = 60 * 60 * 24 * 7;

async function key(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify({ t: token, exp: Date.now() + MAX_AGE * 1000 }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), data));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return Buffer.from(out).toString("base64url");
}

export async function openToken(cookie?: string): Promise<string | null> {
  if (!cookie) return null;
  try {
    const raw = new Uint8Array(Buffer.from(cookie, "base64url"));
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: raw.slice(0, 12) },
      await key(),
      raw.slice(12),
    );
    const { t, exp } = JSON.parse(new TextDecoder().decode(pt));
    return typeof t === "string" && exp > Date.now() ? t : null;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};
