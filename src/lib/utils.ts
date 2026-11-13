export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** URL-safe slug: lowercase, ascii, hyphenated. Keeps "/" when `allowSlash` (nested page paths). */
export function slugify(input: string, allowSlash = false): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(allowSlash ? /[^a-z0-9/]+/g : /[^a-z0-9]+/g, "-");
  const cleaned = allowSlash
    ? base
        .split("/")
        .map((s) => s.replace(/^-+|-+$/g, ""))
        .filter(Boolean)
        .join("/")
    : base.replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 120);
}

/** DD.MM.YY — the newsroom date format observed on the reference. */
export function formatShortDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export function formatLongDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

export function siteUrl(path = "/") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  if (/^https?:\/\//.test(path)) return path;
  return base + (path.startsWith("/") ? path : `/${path}`);
}

/** Only allow safe href schemes in CMS-provided links. */
export function safeHref(href: string | null | undefined): string {
  if (!href) return "#";
  const h = href.trim();
  if (h.startsWith("/") || h.startsWith("#")) return h;
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  return "#";
}

export function isExternal(href: string) {
  return /^(https?:)?\/\//i.test(href) && !href.startsWith(siteUrl("/"));
}

export function truncate(s: string | null | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}
