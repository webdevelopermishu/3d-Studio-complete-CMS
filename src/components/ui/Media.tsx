import { imageUrl, srcSet, videoPosterUrl, videoUrl, type MediaRef } from "@/lib/media/url";
import { cn } from "@/lib/utils";
import { LazyVideo } from "./LazyVideo";

type Props = {
  media: MediaRef | null | undefined;
  /** Optional poster for videos when the media has none */
  poster?: MediaRef | null;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /** Force alt="" when the image is decorative */
  decorative?: boolean;
  fit?: "cover" | "contain";
  /** Render videos as their poster image only */
  stillOnly?: boolean;
  quality?: number;
};

/** Largest `vw` value in a sizes attribute → poster width (960 for half-width slots, else 1440). */
function posterWidth(sizes: string) {
  const vws = [...sizes.matchAll(/(\d+(?:\.\d+)?)vw/g)].map((x) => Number(x[1]));
  const max = vws.length ? Math.max(...vws) : 100;
  return max <= 55 ? 960 : 1440;
}

/**
 * Responsive image / muted loop video.
 * - images: srcset via Cloudinary transforms or the local /media resize route, blur placeholder, lazy by default
 * - videos: lazy-loaded when near the viewport, paused off-screen and under reduced motion
 */
export function Media({ media, poster, sizes = "100vw", className, priority, decorative, fit = "cover", stillOnly, quality = 75 }: Props) {
  if (!media) return <span className={cn("media media--empty", className)} aria-hidden />;
  const style = {
    objectFit: fit,
    backgroundImage: media.blurDataUrl ? `url(${media.blurDataUrl})` : undefined,
    backgroundSize: "cover",
  } as const;

  if (media.kind === "VIDEO") {
    // A poster cannot be responsive, so size it from the widest slot the video is given.
    const pw = posterWidth(sizes);
    const posterUrl = videoPosterUrl(media, pw) ?? (poster ? imageUrl(poster.url, pw) : undefined);
    if (stillOnly) {
      return posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={cn("media", className)} src={posterUrl} alt={decorative ? "" : media.alt} loading={priority ? "eager" : "lazy"} decoding="async" style={style} />
      ) : (
        <span className={cn("media media--empty", className)} aria-hidden />
      );
    }
    return (
      <LazyVideo
        className={cn("media", className)}
        src={videoUrl(media)}
        poster={posterUrl}
        label={decorative ? undefined : media.alt}
        eager={priority}
        style={{ objectFit: fit }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn("media", className)}
      src={imageUrl(media.url, 1440, quality)}
      srcSet={srcSet(media.url, quality)}
      sizes={sizes}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={decorative ? "" : media.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      style={style}
    />
  );
}

export function aspectOf(m: MediaRef | null | undefined, fallback = 1.6) {
  if (!m) return fallback;
  const src = m.kind === "VIDEO" && m.poster ? m.poster : m;
  return src.width && src.height ? src.width / src.height : fallback;
}
