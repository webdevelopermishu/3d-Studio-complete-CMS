# Implementation plan and status

Status legend: ✅ done · 🟡 done with a documented limitation

Scope changes from the original brief:
- **English only** (owner's decision). No locale routing, no translation tables, no hreflang.
- **Brand**: the reference's identity is not used. The demo is a neutral studio, "Halden", that is fully editable in the CMS.

## Phase 0: Environment audit ✅
New project in `site/`. Node 22.23, npm 10.9, PostgreSQL 16 (local), Google Chrome, Playwright 1.63.

Constraints found:
- The sandbox network blocks the reference site, so the reference was inspected only through the desktop-app browser pane.
- Prisma's native engine binaries cannot be downloaded. Prisma therefore runs on the JS query compiler with the `pg` driver adapter, and migrations use a small runner (see `ARCHITECTURE.md` §8).
- Cloudinary's API is unreachable.

## Phase 1: Reference reconnaissance ✅
Route map, page structures, tokens and type scale, layout grid, motion inventory, cursor, menu, footer, work wall and lightbox, contact brief. See `REFERENCE_AUDIT.md`.

## Phase 2: Design system ✅
`src/styles/tokens.css`: colours, fluid type scale, spacing, 12-column grid, easing and durations, taken from the reference's computed styles. The accent, backgrounds and typeface can be overridden at runtime from Admin → Settings.

## Phase 3: Scaffold ✅
Next.js 15 App Router, TypeScript strict, Tailwind 4, route groups for the site and the admin, aliases, ESLint.

## Phase 4: Database and auth ✅
Prisma schema (roles and permissions, users, sessions, content, media, SEO, navigation, redirects, submissions, revisions, audit log), the migration runner, and session auth with scrypt, RBAC, login throttling and a seed with demo content.

## Phase 5: Public frontend ✅
32 section types and their renderers. Pages: home, work, case studies index and detail, expertise index and detail, studio, visual signature, newsroom index and article, contact (five-step brief), legal, privacy, 404. Header with a full-screen menu, footer, cookie consent, back-to-top.

## Phase 6: Motion ✅
Lenis + GSAP ticker; pinned scenes for the hero film, cinema hero, discipline cross-fade, case reel, vision and method; word rises, scroll-scrubbed statements, counters, parallax; page-transition curtain; custom cursor with magnetic buttons; intro loader. Everything is gated by the same media query as the reference and falls back to static layouts.

## Phase 7: Admin CMS ✅
Dashboard; pages with the section builder (drag and drop, templates, duplicate, hide); projects, services, articles; categories; navigation; templates; SEO; submissions; settings; users and roles; profile. Drafts, preview, publish and unpublish, revisions with restore, soft delete, audit log.

## Phase 8: Media ✅ 🟡
Local driver (sharp resizing, AVIF/WebP negotiation, disk cache, range requests) and Cloudinary driver; magic-byte validation; folders, alt text, replace-in-place, usage tracking, video posters.

🟡 The Cloudinary driver is implemented but untested here, because the sandbox cannot reach Cloudinary's API.

## Phase 9: SEO ✅
Metadata builder, canonical URLs, Open Graph and Twitter cards, JSON-LD (Organization, WebSite, BreadcrumbList, Service, CreativeWork, Article), sitemap, robots, middleware redirects, the SEO health checks, and security headers.

## Phase 10: Testing ✅
Vitest unit and integration tests (including real-database tests) and Playwright e2e tests for public flows and every admin area. Results are in `TESTING.md`.

## Phase 11: Visual QA ✅ 🟡
Computed-geometry comparison against probes taken from the reference DOM on eight pages (seven at 1440×900, the home page also at 390×844), with differences fixed. Pixel baselines of this site at five viewports.

🟡 Pixel screenshots of the reference itself could not be captured reliably (see `TESTING.md` → Visual QA), so the comparison is made on measured geometry rather than on screenshots.

## Phase 12: Performance and accessibility ✅
Changes made:
- client scenes code-split, so Zod and React Hook Form load only on the contact page;
- CSS inlined;
- intro text revealed by CSS instead of JavaScript;
- one IntersectionObserver for all reveals;
- prioritised above-the-fold images, real stills under wall videos;
- server-rendered cookie panel;
- accessible names for split headings and the rolling footer link;
- contrast fix for the active filter state;
- intrinsic sizes on logos;
- a CSP that works without eval.

Scores are in `TESTING.md`.

## Phase 13: Documentation and delivery ✅
README, `.env.example`, `scripts/create-admin.ts`, and the deployment, admin, SEO, testing and architecture guides.

## Not included / possible next steps
- A bot challenge on the contact form (Turnstile or hCaptcha) if spam appears; the honeypot and rate limit are in place.
- Scheduled publishing for pages (articles already support future dates).
- An image focal-point editor for crops.
- Live verification of the Cloudinary driver against a real account.
