import type { NavLink, Settings } from "@/server/queries";
import { SmartLink } from "@/components/ui/Primitives";
import { CookiePreferencesButton } from "./CookiePanel";
import { BackToTop } from "./BackToTop";

/** Per-character roll on hover (pure CSS): each char has a front and a back layer. */
function RollingText({ text }: { text: string }) {
  return (
    <span className="roll" aria-hidden>
      {[...text].map((ch, i) =>
        ch === " " ? (
          <span key={i} className="roll__space" />
        ) : (
          <span key={i} className="roll__char" style={{ ["--i" as string]: i }}>
            <span className="roll__front">{ch}</span>
            <span className="roll__back">{ch}</span>
          </span>
        ),
      )}
    </span>
  );
}

export function Footer({ settings, menus }: { settings: Settings; menus: Record<string, NavLink[]> }) {
  const sitemap = menus.FOOTER_SITEMAP ?? [];
  const expertise = menus.FOOTER_EXPERTISE ?? [];
  const social = menus.SOCIAL ?? [];
  const legal = menus.LEGAL ?? [];
  return (
    <footer className="footer" data-ground="dark">
      <div className="footer__call">
        <span className="footer__eyebrow t-label">Start a project</span>
        <h2 className="footer__headline">
          <SmartLink href="/contact" className="footer__headline-link">
            <span className="visually-hidden">{settings.footerCta}</span>
            <RollingText text={settings.footerCta} />
          </SmartLink>
        </h2>
        {settings.email && (
          <a className="footer__email" href={`mailto:${settings.email}`}>
            {settings.email}
          </a>
        )}
      </div>

      <nav className="footer__nav grid12" aria-label="Footer">
        <div className="footer__col footer__col--map">
          <span className="footer__col-label t-label">Sitemap</span>
          <ul className="footer__links">
            {sitemap.map((l) => (
              <li key={l.href}>
                <SmartLink href={l.href}>{l.label}</SmartLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer__col footer__col--expertise">
          <span className="footer__col-label t-label">Expertise</span>
          <ul className="footer__links">
            {expertise.map((l) => (
              <li key={l.href}>
                <SmartLink href={l.href}>{l.label}</SmartLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer__col footer__col--social">
          <span className="footer__col-label t-label">Elsewhere</span>
          <ul className="footer__links">
            {social.map((l) => (
              <li key={l.href}>
                <SmartLink href={l.href}>{l.label}</SmartLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer__top">
          <BackToTop />
        </div>
      </nav>

      <div className="footer__rule" />
      <div className="footer__bottom">
        <span className="footer__copyright t-label">{settings.copyright}</span>
        <span className="footer__identity" aria-hidden>
          {settings.logoMark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoMark.url} alt="" className="footer__logo" />
          ) : (
            <span className="footer__logo footer__logo--fallback">{settings.siteName.slice(0, 1)}</span>
          )}
        </span>
        <span className="footer__legal t-label">
          {legal.map((l) => (
            <SmartLink key={l.href} href={l.href}>
              {l.label}
            </SmartLink>
          ))}
          <CookiePreferencesButton />
        </span>
      </div>
    </footer>
  );
}
