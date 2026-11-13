"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NavLink } from "@/server/queries";
import { SmartLink } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";
import { useLenis } from "@/components/motion/MotionProvider";

type Props = {
  siteName: string;
  logoUrl?: string | null;
  tagline: string;
  email: string;
  main: NavLink[];
  social: NavLink[];
};

export function Header({ siteName, logoUrl, tagline, email, main, social }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ground, setGround] = useState<"dark" | "light">("dark");
  const pathname = usePathname();
  const lenis = useLenis();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on navigation
  useEffect(() => setOpen(false), [pathname]);

  // Shrink on scroll + flip colour over light sections
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setScrolled(window.scrollY > 40);
      const probeY = 42;
      const lights = document.querySelectorAll<HTMLElement>('[data-ground="light"]');
      let isLight = false;
      lights.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= probeY && r.bottom >= probeY) isLight = true;
      });
      setGround(isLight ? "light" : "dark");
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Lock scroll + focus management while the menu is open
  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      lenis?.stop();
      html.classList.add("menu-open");
      const first = menuRef.current?.querySelector<HTMLElement>("a, button");
      first?.focus();
    } else {
      lenis?.start();
      html.classList.remove("menu-open");
    }
  }, [open, lenis]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && menuRef.current) {
        const items = [...menuRef.current.querySelectorAll<HTMLElement>("a, button"), toggleRef.current!].filter(Boolean);
        const idx = items.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && idx <= 0) {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (!e.shiftKey && idx === items.length - 1) {
          e.preventDefault();
          items[0].focus();
        }
      }
    },
    [open],
  );

  return (
    <div onKeyDown={onKey}>
      <header className={cn("nav", scrolled && "nav--scrolled", open && "nav--open")} data-ground={open ? "dark" : ground}>
        <Link href="/" className="nav__logo" aria-label={`${siteName} — home`}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="nav__logo-img" />
          ) : (
            <span className="nav__wordmark">
              {siteName}
              <span className="nav__mark" aria-hidden />
            </span>
          )}
        </Link>
        <div className="nav__right">
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            data-cursor="hide"
          >
            <svg viewBox="0 0 44 44" aria-hidden>
              <rect className="menu-toggle__shape" x="7" y="7" width="30" height="30" transform="rotate(-20 22 22)" />
              <line className="menu-toggle__bar menu-toggle__bar--a" x1="15" y1="19" x2="29" y2="19" />
              <line className="menu-toggle__bar menu-toggle__bar--b" x1="15" y1="25" x2="29" y2="25" />
            </svg>
          </button>
        </div>
      </header>

      <div id="site-menu" ref={menuRef} className={cn("menu", open && "menu--open")} role="dialog" aria-modal="true" aria-label="Site menu" hidden={!open}>
        <div className="menu__panel">
          <nav className="menu__list" aria-label="Main">
            <ul>
              {main.map((l, i) => (
                <li key={l.href} style={{ ["--i" as string]: i }}>
                  <SmartLink href={l.href} className={cn("menu-link", pathname === l.href && "is-current")} aria-current={pathname === l.href ? "page" : undefined}>
                    <span className="menu-link__index t-label">{String(i + 1).padStart(2, "0")}</span>
                    <span className="menu-link__title">{l.label}</span>
                  </SmartLink>
                </li>
              ))}
            </ul>
          </nav>
          <aside className="menu__aside">
            <div className="menu__aside-block">
              <span className="menu__aside-label">Studio</span>
              <p className="menu__aside-text">{tagline}</p>
            </div>
            {email && (
              <div className="menu__aside-block">
                <span className="menu__aside-label">Contact</span>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            )}
            {social.length > 0 && (
              <div className="menu__aside-block">
                <span className="menu__aside-label">Elsewhere</span>
                {social.map((s) => (
                  <SmartLink key={s.href} href={s.href}>
                    {s.label}
                  </SmartLink>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
