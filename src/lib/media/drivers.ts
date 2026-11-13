import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { slugify } from "@/lib/utils";

const run = promisify(execFile);

export type StoredFile = {
  provider: "local" | "cloudinary";
  key: string;
  url: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  blurDataUrl?: string;
  /** For videos: a JPEG poster frame, if the driver could produce one */
  poster?: { buffer: Buffer; filename: string };
};

export interface StorageDriver {
  name: "local" | "cloudinary";
  put(file: { buffer: Buffer; filename: string; mime: string }): Promise<StoredFile>;
  remove(key: string, kind: "IMAGE" | "VIDEO"): Promise<void>;
}

export const ALLOWED_MIME: Record<string, "IMAGE" | "VIDEO"> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/avif": "IMAGE",
  "image/gif": "IMAGE",
  "image/svg+xml": "IMAGE",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
};
export const MAX_BYTES = { IMAGE: 25 * 1024 * 1024, VIDEO: 200 * 1024 * 1024 };

export function uploadRoot() {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR || "./storage/uploads");
}

async function blurFor(buffer: Buffer): Promise<string | undefined> {
  try {
    const out = await sharp(buffer).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    return `data:image/webp;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function probeVideo(file: string) {
  try {
    const { stdout } = await run("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration", "-of", "json", file,
    ]);
    const j = JSON.parse(stdout);
    return {
      width: j.streams?.[0]?.width as number | undefined,
      height: j.streams?.[0]?.height as number | undefined,
      duration: j.format?.duration ? Number(j.format.duration) : undefined,
    };
  } catch {
    return {};
  }
}

async function posterFrame(file: string): Promise<Buffer | undefined> {
  try {
    const out = file + ".poster.jpg";
    await run("ffmpeg", ["-y", "-v", "error", "-ss", "0.1", "-i", file, "-frames:v", "1", "-q:v", "3", out]);
    const { readFile } = await import("node:fs/promises");
    const buf = await readFile(out);
    await unlink(out).catch(() => {});
    return buf;
  } catch {
    return undefined;
  }
}

/** Persistent local disk storage (dev / single-server). Not a temp dir: survives restarts. */
export const localDriver: StorageDriver = {
  name: "local",
  async put({ buffer, filename, mime }) {
    const kind = ALLOWED_MIME[mime];
    const ext = path.extname(filename).toLowerCase() || (kind === "VIDEO" ? ".mp4" : ".jpg");
    const base = slugify(path.basename(filename, path.extname(filename))) || "file";
    const now = new Date();
    const rel = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(4).toString("hex")}-${base}${ext}`;
    const abs = path.join(uploadRoot(), rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    const result: StoredFile = { provider: "local", key: rel, url: `/media/${rel}`, bytes: buffer.length };
    if (kind === "IMAGE" && mime !== "image/svg+xml") {
      const meta = await sharp(buffer).metadata();
      result.width = meta.width;
      result.height = meta.height;
      result.blurDataUrl = await blurFor(buffer);
    } else if (kind === "VIDEO") {
      Object.assign(result, await probeVideo(abs));
      const poster = await posterFrame(abs);
      if (poster) result.poster = { buffer: poster, filename: `${base}-poster.jpg` };
    }
    return result;
  },
  async remove(key) {
    const abs = path.join(uploadRoot(), key);
    if (!abs.startsWith(uploadRoot())) return;
    await unlink(abs).catch(() => {});
  },
};

/** Cloudinary storage (recommended for production / serverless). */
export const cloudinaryDriver: StorageDriver = {
  name: "cloudinary",
  async put({ buffer, filename, mime }) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ secure: true }); // reads CLOUDINARY_URL
    const kind = ALLOWED_MIME[mime];
    const folder = process.env.CLOUDINARY_FOLDER || "studio";
    const res = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: kind === "VIDEO" ? "video" : "image",
          public_id: `${slugify(path.basename(filename, path.extname(filename))) || "file"}-${randomBytes(3).toString("hex")}`,
          overwrite: false,
        },
        (err, r) => (err || !r ? reject(err ?? new Error("Upload failed")) : resolve(r as unknown as Record<string, unknown>)),
      );
      stream.end(buffer);
    });
    return {
      provider: "cloudinary",
      key: String(res.public_id),
      url: String(res.secure_url),
      width: res.width as number | undefined,
      height: res.height as number | undefined,
      duration: res.duration as number | undefined,
      bytes: Number(res.bytes ?? buffer.length),
      blurDataUrl: kind === "IMAGE" && mime !== "image/svg+xml" ? await blurFor(buffer) : undefined,
    };
  },
  async remove(key, kind) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ secure: true });
    await cloudinary.uploader.destroy(key, { resource_type: kind === "VIDEO" ? "video" : "image", invalidate: true });
  },
};

export function getDriver(name?: string): StorageDriver {
  const n = name ?? process.env.MEDIA_DRIVER ?? (process.env.CLOUDINARY_URL ? "cloudinary" : "local");
  if (n === "cloudinary") {
    if (!process.env.CLOUDINARY_URL) throw new Error("MEDIA_DRIVER=cloudinary requires CLOUDINARY_URL");
    return cloudinaryDriver;
  }
  return localDriver;
}

export async function localFileExists(key: string) {
  try {
    const abs = path.join(uploadRoot(), key);
    if (!abs.startsWith(uploadRoot())) return false;
    return (await stat(abs)).isFile();
  } catch {
    return false;
  }
}
