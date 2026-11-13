import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed, short-lived preview tokens: base64url(json).hmac */
export type PreviewClaims = { type: "page" | "project" | "service" | "article"; id: string; exp: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (min 32 chars)");
  return s;
}

export function signPreviewToken(type: PreviewClaims["type"], id: string, ttlSeconds = 15 * 60): string {
  const payload = Buffer.from(JSON.stringify({ type, id, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPreviewToken(token: string | null | undefined): PreviewClaims | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as PreviewClaims;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (!["page", "project", "service", "article"].includes(claims.type)) return null;
    return claims;
  } catch {
    return null;
  }
}
