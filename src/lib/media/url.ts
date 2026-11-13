/**
 * Client-safe media URL helpers. Media objects are serialised to this shape for components.
 */
export type MediaRef = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  provider: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
  blurDataUrl: string | null;
  poster?: MediaRef | null;
};

export const IMAGE_WIDTHS = [384, 640, 828, 1080, 1440, 1920, 2560];

function nearestWidth(w: number) {
  return IMAGE_WIDTHS.find((x) => x >= w) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

/** Width-specific URL: Cloudinary transformation, or the local resize route. */
export function imageUrl(src: string, width: number, quality = 75): string {
  const w = nearestWidth(width);
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_auto:${quality >= 80 ? "good" : "eco"},c_limit,w_${w}/`);
  }
  if (src.startsWith("/media/")) {
    if (src.endsWith(".svg")) return src;
    return `${src}?w=${w}&q=${quality}`;
  }
  return src;
}

export function srcSet(src: string, quality = 75) {
  if (src.endsWith(".svg")) return undefined;
  return IMAGE_WIDTHS.map((w) => `${imageUrl(src, w, quality)} ${w}w`).join(", ");
}

/** Poster image URL for a video (explicit poster, or Cloudinary's derived frame). */
export function videoPosterUrl(m: MediaRef, width = 1440): string | undefined {
  if (m.poster) return imageUrl(m.poster.url, width);
  if (m.url.includes("res.cloudinary.com") && m.url.includes("/video/upload/")) {
    return m.url.replace("/video/upload/", `/video/upload/so_0,f_auto,q_auto,w_${nearestWidth(width)}/`).replace(/\.\w+$/, ".jpg");
  }
  return undefined;
}

export function videoUrl(m: MediaRef): string {
  if (m.url.includes("res.cloudinary.com") && m.url.includes("/video/upload/")) {
    return m.url.replace("/video/upload/", "/video/upload/q_auto,vc_auto/");
  }
  return m.url;
}
