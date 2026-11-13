/**
 * The origin the visitor actually used. Behind a reverse proxy (Hostinger, Docker, a CDN) the
 * request URL a Next.js server sees can carry its internal address (e.g. http://0.0.0.0:3000),
 * so absolute redirects and origin checks use the forwarded headers, then the Host header, then
 * the configured NEXT_PUBLIC_SITE_URL.
 */
export function publicOrigin(req: Request): string {
  const h = req.headers;
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  const host = first(h.get("x-forwarded-host")) ?? first(h.get("host"));
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const proto = first(h.get("x-forwarded-proto")) ?? (site?.startsWith("https:") ? "https" : new URL(req.url).protocol.replace(":", ""));
  if (host) return `${proto}://${host}`;
  return site || new URL(req.url).origin;
}

export function publicUrl(req: Request, path: string): URL {
  return new URL(path, publicOrigin(req));
}

/** True when the browser's Origin header matches the host the visitor used (or the configured site URL). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // older browsers omit it on same-origin posts; the session cookie is still required
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set<string>([new URL(publicOrigin(req)).host]);
  const plainHost = req.headers.get("host");
  if (plainHost) allowed.add(plainHost.trim());
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
  } catch {
    /* ignore a malformed setting */
  }
  return allowed.has(host);
}
