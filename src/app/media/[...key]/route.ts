import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";
import { uploadRoot } from "@/lib/media/storage";
import { IMAGE_WIDTHS } from "@/lib/media/url";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};
const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Serves locally stored uploads (MEDIA_DRIVER=local). Images accept ?w=&q= and are resized,
 * converted to AVIF/WebP per Accept header, and cached on disk. Videos support Range requests.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const root = uploadRoot();
  const rel = key.map(decodeURIComponent).join("/");
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });

  let info;
  try {
    info = await stat(abs);
    if (!info.isFile()) throw new Error();
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const ext = path.extname(abs).toLowerCase();
  const type = TYPES[ext] ?? "application/octet-stream";
  const url = new URL(req.url);

  if (type.startsWith("video/")) {
    const range = req.headers.get("range");
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m?.[1] ? Number(m[1]) : 0;
      const end = m?.[2] ? Math.min(Number(m[2]), info.size - 1) : Math.min(start + 4 * 1024 * 1024, info.size - 1);
      if (start >= info.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      return new Response(Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream, {
        status: 206,
        headers: { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1), "Cache-Control": IMMUTABLE },
      });
    }
    return new Response(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
      headers: { "Content-Type": type, "Content-Length": String(info.size), "Accept-Ranges": "bytes", "Cache-Control": IMMUTABLE },
    });
  }

  const wParam = Number(url.searchParams.get("w"));
  if (!wParam || ext === ".svg" || ext === ".gif") {
    return new Response(new Uint8Array(await readFile(abs)), { headers: { "Content-Type": type, "Cache-Control": IMMUTABLE } });
  }
  const width = IMAGE_WIDTHS.find((x) => x >= wParam) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  const quality = Math.min(90, Math.max(40, Number(url.searchParams.get("q")) || 75));
  const accept = req.headers.get("accept") ?? "";
  const format: "avif" | "webp" | "jpeg" = accept.includes("image/avif") ? "avif" : accept.includes("image/webp") ? "webp" : "jpeg";
  const cacheFile = path.join(root, ".cache", `${rel}@${width}q${quality}.${format}`);

  let out: Buffer;
  try {
    out = await readFile(cacheFile);
  } catch {
    const img = sharp(abs).rotate().resize({ width, withoutEnlargement: true });
    out = await (format === "avif" ? img.avif({ quality: quality - 20, effort: 3 }) : format === "webp" ? img.webp({ quality }) : img.jpeg({ quality, mozjpeg: true })).toBuffer();
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, out).catch(() => {});
  }
  return new Response(new Uint8Array(out), { headers: { "Content-Type": `image/${format}`, "Cache-Control": IMMUTABLE, Vary: "Accept" } });
}
