import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPreviewToken } from "@/lib/preview";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * Enables Draft Mode for a signed preview token (issued by the admin, 15 min TTL).
 * Requires an authenticated admin session as well, so leaked links don't expose drafts.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const claims = verifyPreviewToken(url.searchParams.get("token"));
  if (!claims) return new Response("Invalid or expired preview link.", { status: 401 });
  const user = await getCurrentUser();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`);

  let path: string | null = null;
  if (claims.type === "page") {
    const p = await db.page.findUnique({ where: { id: claims.id }, select: { slug: true } });
    path = p ? `/${p.slug}` : null;
  } else if (claims.type === "project") {
    const p = await db.project.findUnique({ where: { id: claims.id }, select: { slug: true } });
    path = p ? `/case-studies/${p.slug}` : null;
  } else if (claims.type === "service") {
    const s = await db.service.findUnique({ where: { id: claims.id }, select: { slug: true } });
    path = s ? `/expertise/${s.slug}` : null;
  } else {
    const a = await db.article.findUnique({ where: { id: claims.id }, select: { slug: true } });
    path = a ? `/newsroom/${a.slug}` : null;
  }
  if (!path) return new Response("Not found", { status: 404 });
  (await draftMode()).enable();
  redirect(path);
}
