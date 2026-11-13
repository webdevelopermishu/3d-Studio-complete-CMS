import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ALLOWED_MIME, MAX_BYTES, getDriver } from "@/lib/media/storage";
import type { CurrentUser } from "@/lib/auth/session";

/** Stores an upload with the configured driver and creates (or replaces) the Media row. */
export async function storeUpload(file: File, user: CurrentUser, opts: { folderId?: string | null; replaceId?: string | null } = {}) {
  const mime = file.type;
  const kind = ALLOWED_MIME[mime];
  if (!kind) throw new Error(`Unsupported file type: ${mime || "unknown"}`);
  if (file.size > MAX_BYTES[kind]) throw new Error(`File too large (max ${Math.round(MAX_BYTES[kind] / 1024 / 1024)} MB).`);
  const buffer = Buffer.from(await file.arrayBuffer());
  // Magic-byte sniffing — don't trust the browser-provided type alone
  if (!sniff(buffer, mime)) throw new Error("File content doesn't match its type.");

  const driver = getDriver();
  const stored = await driver.put({ buffer, filename: file.name, mime });

  let posterId: string | undefined;
  if (stored.poster) {
    const p = await driver.put({ buffer: stored.poster.buffer, filename: stored.poster.filename, mime: "image/jpeg" });
    const poster = await db.media.create({
      data: {
        kind: "IMAGE", provider: p.provider, key: p.key, url: p.url, filename: stored.poster.filename, mime: "image/jpeg",
        width: p.width, height: p.height, bytes: p.bytes, blurDataUrl: p.blurDataUrl, alt: "", title: `${file.name} poster`,
        folderId: opts.folderId ?? undefined, uploadedById: user.id,
      },
    });
    posterId = poster.id;
  }

  const data = {
    kind, provider: stored.provider, key: stored.key, url: stored.url, filename: file.name, mime,
    width: stored.width ?? null, height: stored.height ?? null, bytes: stored.bytes, duration: stored.duration ?? null,
    blurDataUrl: stored.blurDataUrl ?? null, ...(posterId ? { posterId } : {}),
  } satisfies Prisma.MediaUncheckedUpdateInput;

  if (opts.replaceId) {
    const old = await db.media.findUniqueOrThrow({ where: { id: opts.replaceId } });
    if (old.kind !== kind) throw new Error(`Replace with the same kind of file (${old.kind.toLowerCase()}).`);
    const row = await db.media.update({ where: { id: old.id }, data });
    await getDriver(old.provider).remove(old.key, old.kind).catch(() => {});
    return row;
  }
  return db.media.create({
    data: { ...data, alt: "", title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), folderId: opts.folderId ?? undefined, uploadedById: user.id },
  });
}

function sniff(b: Buffer, mime: string) {
  const hex = b.subarray(0, 12).toString("hex");
  switch (mime) {
    case "image/jpeg": return hex.startsWith("ffd8ff");
    case "image/png": return hex.startsWith("89504e47");
    case "image/gif": return hex.startsWith("47494638");
    case "image/webp": return hex.startsWith("52494646") && b.subarray(8, 12).toString() === "WEBP";
    case "image/avif": return b.subarray(4, 12).toString().startsWith("ftypavi");
    case "image/svg+xml": {
      const head = b.subarray(0, 2048).toString("utf8").toLowerCase();
      return head.includes("<svg") && !head.includes("<script") && !/\son\w+=/.test(head);
    }
    case "video/mp4":
    case "video/quicktime": return b.subarray(4, 8).toString() === "ftyp";
    case "video/webm": return hex.startsWith("1a45dfa3");
    default: return false;
  }
}

/** Where is this media used? (covers, OG images, settings, section JSON) */
export async function mediaUsage(id: string) {
  const like = `%"${id}"%`;
  const [sections, projects, services, articles, seo, settings] = await Promise.all([
    db.$queryRaw<{ id: string; pageId: string | null; projectId: string | null; serviceId: string | null }[]>`SELECT id, "pageId", "projectId", "serviceId" FROM "PageSection" WHERE data::text LIKE ${like} LIMIT 50`,
    db.project.findMany({ where: { OR: [{ coverId: id }, { videoId: id }], deletedAt: null }, select: { id: true, title: true } }),
    db.service.findMany({ where: { coverId: id, deletedAt: null }, select: { id: true, title: true } }),
    db.article.findMany({ where: { coverId: id, deletedAt: null }, select: { id: true, title: true } }),
    db.sEOSettings.count({ where: { ogImageId: id } }),
    db.globalSettings.count({ where: { OR: [{ logoId: id }, { logoMarkId: id }, { faviconId: id }] } }),
  ]);
  const settingsSeo = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "GlobalSettings" WHERE "seoDefaults"::text LIKE ${like}`;
  const items: { label: string; href: string }[] = [
    ...projects.map((p) => ({ label: `Project: ${p.title}`, href: `/admin/projects/${p.id}` })),
    ...services.map((s) => ({ label: `Service: ${s.title}`, href: `/admin/services/${s.id}` })),
    ...articles.map((a) => ({ label: `Article: ${a.title}`, href: `/admin/articles/${a.id}` })),
    ...sections.map((s) => ({
      label: "Section content",
      href: s.pageId ? `/admin/pages/${s.pageId}` : s.projectId ? `/admin/projects/${s.projectId}` : `/admin/services/${s.serviceId}`,
    })),
  ];
  if (seo) items.push({ label: `${seo} SEO share image(s)`, href: "/admin/seo" });
  if (settings || Number(settingsSeo[0]?.n ?? 0)) items.push({ label: "Global settings", href: "/admin/settings" });
  return items;
}
