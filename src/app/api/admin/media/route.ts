import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/session";
import { storeUpload } from "@/server/admin/media";
import { revalidateSite, audit } from "@/server/admin/guard";
import { logger } from "@/lib/logger";
import { isSameOrigin } from "@/lib/public-url";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Multipart upload (one or many files). `replaceId` swaps the file behind an existing Media id. */
export async function POST(req: Request) {
  try {
    const user = await requirePermission("media.write");
    // Same-origin check (CSRF hardening on top of SameSite=Lax cookies)
    if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    const form = await req.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return NextResponse.json({ error: "No file received." }, { status: 400 });
    const folderId = (form.get("folderId") as string) || null;
    const replaceId = (form.get("replaceId") as string) || null;
    const out = [];
    for (const f of files.slice(0, 20)) {
      const row = await storeUpload(f, user, { folderId, replaceId });
      out.push({ id: row.id, url: row.url, kind: row.kind, filename: row.filename });
      if (replaceId) break;
    }
    await audit(user, replaceId ? "media.replace" : "media.upload", "media", out[0]?.id, { count: out.length });
    if (replaceId) revalidateSite();
    return NextResponse.json({ items: out });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    logger.warn("media.upload_failed", { error: String(e) });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
