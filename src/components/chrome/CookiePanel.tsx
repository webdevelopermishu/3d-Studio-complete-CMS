"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "cookie-consent-v1";
type Consent = { necessary: true; analytics: boolean; at: string };

function read(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as Consent) : null;
  } catch {
    return null;
  }
}
function write(analytics: boolean) {
  const c: Consent = { necessary: true, analytics, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
  window.dispatchEvent(new CustomEvent("consent-change", { detail: c }));
}

export function CookiePreferencesButton() {
  return (
    <button type="button" className="footer__cookies t-label" onClick={() => window.dispatchEvent(new Event("open-cookie-panel"))}>
      Cookie preferences
    </button>
  );
}

/**
 * Consent panel. Optional analytics (GA4) only load after explicit consent.
 *
 * The panel is rendered on the server so it paints with the page instead of appearing after
 * hydration. The boot script in the site layout adds `has-consent` to <html> before first paint
 * when a choice is already stored, and CSS hides the server-rendered panel in that case.
 */
export function CookiePanel({ text, analyticsId }: { text: string; analyticsId?: string }) {
  const [open, setOpen] = useState(true);
  const [reopened, setReopened] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const c = read();
    if (c) {
      setOpen(false);
      setAnalytics(c.analytics);
    }
    const reopen = () => {
      setAnalytics(read()?.analytics ?? false);
      setDetails(true);
      setReopened(true);
      setOpen(true);
    };
    window.addEventListener("open-cookie-panel", reopen);
    return () => window.removeEventListener("open-cookie-panel", reopen);
  }, []);

  // Load analytics only with consent
  useEffect(() => {
    if (!analyticsId) return;
    const load = () => {
      if (!read()?.analytics || document.getElementById("ga-src")) return;
      const s = document.createElement("script");
      s.id = "ga-src";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
      document.head.appendChild(s);
      const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", analyticsId, { anonymize_ip: true });
    };
    load();
    window.addEventListener("consent-change", load);
    return () => window.removeEventListener("consent-change", load);
  }, [analyticsId]);

  if (!open) return null;
  const done = (a: boolean) => {
    write(a);
    setOpen(false);
  };
  return (
    <section className="cookie-panel" data-auto={reopened ? undefined : ""} role="dialog" aria-labelledby="cookie-title" aria-live="polite">
      <h2 id="cookie-title" className="t-label cookie-panel__title">Cookies</h2>
      <p className="cookie-panel__text">{text}</p>
      {details && (
        <ul className="cookie-panel__list">
          <li>
            <span>Necessary</span>
            <span className="cookie-panel__always">Always on</span>
          </li>
          <li>
            <label htmlFor="consent-analytics">Analytics</label>
            <button
              id="consent-analytics"
              type="button"
              role="switch"
              aria-checked={analytics}
              className="cookie-switch"
              onClick={() => setAnalytics((v) => !v)}
            >
              <span className="visually-hidden">Analytics cookies</span>
            </button>
          </li>
        </ul>
      )}
      <div className="cookie-panel__actions">
        <button type="button" className="cookie-panel__btn" onClick={() => done(false)}>
          Reject optional cookies
        </button>
        <button type="button" className="cookie-panel__btn cookie-panel__btn--primary" onClick={() => done(details ? analytics : true)}>
          {details ? "Save choices" : "Accept all"}
        </button>
      </div>
      <div className="cookie-panel__links">
        {!details && (
          <button type="button" onClick={() => setDetails(true)}>
            Choose cookies
          </button>
        )}
        <Link href="/privacy">Privacy policy</Link>
      </div>
    </section>
  );
}
