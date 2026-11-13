import { draftMode } from "next/headers";
import Link from "next/link";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { Cursor } from "@/components/chrome/Cursor";
import { PageTransition } from "@/components/chrome/PageTransition";
import { Loader } from "@/components/chrome/Loader";
import { CookiePanel } from "@/components/chrome/CookiePanel";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo/jsonld";
import { themeCss } from "@/lib/theme";
import { getMenus, getSettings } from "@/server/queries";
import "./site.css";

export async function generateMetadata() {
  const s = await getSettings();
  return {
    title: { default: s.siteName, template: s.seoDefaults.titleTemplate || `%s | ${s.siteName}` },
    description: s.seoDefaults.description || s.tagline,
    icons: s.favicon ? { icon: s.favicon.url } : undefined,
  };
}

/**
 * Runs before first paint: marks JS + motion availability so CSS can pre-hide reveal targets
 * (no flash), skips the loader on repeat visits / reduced motion, and hides the cookie panel when
 * a choice is already stored. A failsafe removes the pre-hide if the motion runtime hasn't started
 * within 4s.
 */
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js-boot');var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!r){d.classList.add('js-motion');setTimeout(function(){if(!d.classList.contains('motion-ready'))d.classList.remove('js-motion')},4000);}
try{if(r||sessionStorage.getItem('loader-seen')||!d.dataset.loader)d.classList.add('no-loader')}catch(e){d.classList.add('no-loader')}
try{if(localStorage.getItem('cookie-consent-v1'))d.classList.add('has-consent')}catch(e){}})();`;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, menus, draft] = await Promise.all([getSettings(), getMenus(), draftMode()]);
  const theme = themeCss(settings.theme);
  const social = menus.SOCIAL ?? [];
  return (
    <div className="site" data-loader={settings.features.showLoader ? "on" : undefined}>
      <link rel="preload" href={theme.preload} as="font" type="font/woff2" crossOrigin="" />
      <style dangerouslySetInnerHTML={{ __html: theme.css }} />
      <script
        dangerouslySetInnerHTML={{
          __html: settings.features.showLoader ? `document.documentElement.dataset.loader='on';${bootScript}` : bootScript,
        }}
      />
      <JsonLd data={[organizationLd(settings, social.map((s) => s.href)), websiteLd(settings)]} />
      <a href="#content" className="skip-link t-label">
        Skip to content
      </a>
      {settings.features.showLoader && <Loader />}
      <MotionProvider smooth={settings.features.smoothScroll}>
        <Header
          siteName={settings.siteName}
          logoUrl={settings.logo?.url}
          tagline={settings.tagline}
          email={settings.email}
          main={menus.MAIN ?? []}
          social={social}
        />
        <main id="content" className="main" tabIndex={-1}>
          {children}
        </main>
        <Footer settings={settings} menus={menus} />
        <PageTransition />
        {settings.features.customCursor && <Cursor />}
      </MotionProvider>
      <CookiePanel text={settings.cookieText} analyticsId={settings.analyticsId} />
      {draft.isEnabled && (
        <div className="preview-bar" role="status">
          <span>Preview mode — showing unpublished changes.</span>
          <Link href="/api/preview/exit" prefetch={false}>
            Exit preview
          </Link>
        </div>
      )}
    </div>
  );
}
