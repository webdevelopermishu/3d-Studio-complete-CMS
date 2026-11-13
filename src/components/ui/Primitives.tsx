import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn, safeHref } from "@/lib/utils";

/** Splits text into words wrapped for the word-rise reveal. Newlines become line breaks. */
export function SplitWords({ text, className, manual, scrub }: { text: string; className?: string; manual?: boolean; scrub?: boolean }) {
  const lines = text.split(/\n/);
  // Screen readers get the sentence once, from the hidden copy; the per-word animation layer is aria-hidden.
  return (
    <>
    <span className="visually-hidden">{lines.join(" ")}</span>
    <span className={cn("split", className)} aria-hidden data-split={scrub ? undefined : ""} data-split-manual={manual ? "" : undefined} data-scrub-words={scrub ? "" : undefined}>
      {lines.map((line, li) => (
        <span key={li} className="split__line">
          {line
            .split(/\s+/)
            .filter(Boolean)
            .map((w, wi, arr) => (
              <Fragment key={wi}>
                <span className="split__mask">
                  <span className="split__word" data-word>
                    {w}
                  </span>
                </span>
                {wi < arr.length - 1 ? " " : null}
              </Fragment>
            ))}
        </span>
      ))}
    </span>
    </>
  );
}

export function SmartLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children?: ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const h = safeHref(href);
  if (/^(https?:|mailto:|tel:)/i.test(h)) {
    const ext = /^https?:/i.test(h);
    return (
      <a href={h} className={className} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={h} className={className} {...rest}>
      {children}
    </Link>
  );
}

export function CircleButton({
  href,
  label,
  size = 150,
  className,
}: {
  href: string;
  label: string;
  size?: number;
  className?: string;
}) {
  return (
    <SmartLink href={href} className={cn("circle-btn", className)} style={{ ["--circle-size" as string]: `${size}px` }} data-magnetic>
      <span className="circle-btn__fill" aria-hidden />
      <span className="circle-btn__label">{label}</span>
    </SmartLink>
  );
}

export function ArrowLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <SmartLink href={href} className={cn("arrow-link t-label", className)}>
      <span>{label}</span>
      <span className="arrow-link__arrow" aria-hidden>
        →
      </span>
    </SmartLink>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={cn("t-label eyebrow", className)}>{children}</p>;
}
