import { NextResponse, type NextRequest } from "next/server";
import { Pool } from "pg";
import { publicUrl } from "@/lib/public-url";

/**
 * 1) CMS-managed redirects (Admin → SEO → Redirects), cached in memory for 30s per instance.
 * 2) Cheap admin gate: no session cookie → login. Real authorisation happens server-side.
 * 3) noindex on admin and draft-preview responses (security headers live in next.config.ts).
 */
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/|media/|fonts/|favicon|robots.txt|sitemap.xml|api/health).*)"],
};

type Rule = { source: string; destination: string; permanent: boolean; id: string };
const g = globalThis as unknown as { __redirects?: { at: number; rules: Map<string, Rule> }; __mwPool?: Pool };
const TTL = 30_000;

function pool() {
  if (!g.__mwPool) g.__mwPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return g.__mwPool;
}

async function rules(): Promise<Map<string, Rule>> {
  if (g.__redirects && Date.now() - g.__redirects.at < TTL) return g.__redirects.rules;
  try {
    const { rows } = await pool().query<Rule>(`SELECT id, source, destination, permanent FROM "Redirect" WHERE enabled = true`);
    const map = new Map(rows.map((r) => [normalize(r.source), r]));
    g.__redirects = { at: Date.now(), rules: map };
    return map;
  } catch {
    return g.__redirects?.rules ?? new Map();
  }
}

const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p).toLowerCase();

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const res = pathname === "/admin/login" || req.cookies.has("studio_session")
      ? NextResponse.next()
      : NextResponse.redirect(publicUrl(req, `/admin/login?next=${encodeURIComponent(pathname)}`));
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const rule = (await rules()).get(normalize(pathname));
  if (rule) {
    pool().query(`UPDATE "Redirect" SET hits = hits + 1 WHERE id = $1`, [rule.id]).catch(() => {});
    const dest = /^https?:\/\//.test(rule.destination) ? rule.destination : publicUrl(req, rule.destination).toString();
    return NextResponse.redirect(dest, rule.permanent ? 308 : 307);
  }
  const res = NextResponse.next();
  if (req.cookies.has("__prerender_bypass")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
