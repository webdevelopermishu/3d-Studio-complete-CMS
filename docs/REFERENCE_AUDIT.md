# Reference Audit — lumia-render.com

Audit date: 2026-11-08
Reference: https://www.lumia-render.com/en (+ `/fr`)

## 0. How this audit was done (and its limits)

| Method | Used for | Status |
|---|---|---|
| Server-side text fetch of 11 routes | Route map, headings, copy structure, links | Done |
| Live browser (desktop app browser pane) on `/en` at 1440×900 | Computed CSS tokens, `:root` variables, section geometry, media ratios, animation hooks, media queries | Done (homepage only) |
| Sandbox Playwright/Chrome | Full-page screenshots at 5 viewports | **Blocked.** The workspace network allowlist returns 403 for lumia-render.com |
| Hover / click / scroll-motion review by eye | Animation feel, timings | **Partial.** The browser pane was hidden, so screenshots timed out mid-scroll. Motion is inferred from GSAP inline styles and class names, not observed frame by frame |

**Open evidence gaps** (closed in Phase 1b before building, see IMPLEMENTATION_PLAN):
- Screenshots at 1920×1080, 768×1024, 390×844, 375×812 for every route
- DOM/token extraction on the inner templates (work, case study, expertise detail, contact, newsroom article, studio)
- Hover states (nav, cards, arrow links, circle button), mobile menu open state, page-transition curtain timing
- Contact form steps 2–5

Nothing in this document comes from guesswork. Where a fact is inferred, it is marked *(inferred)*.

## 1. Stack observed

- **Next.js** (App Router chunks: `main-app-*.js`, Vercel `dpl_` build IDs)
- **Sanity CMS** (images from `cdn.sanity.io`, project `4sqgedg3`, with `w`/`q` params)
- **Lenis** smooth scroll (`html.lenis`, `window.lenis` present)
- **GSAP + ScrollTrigger** (`pin-spacer` wrappers, GSAP-style inline `translate/rotate/scale` resets) *(inferred: GSAP is bundled, not global)*
- Word-level split text (`span[data-word]`, `display:inline-block`, `transform-origin: 0% 100%`)
- Self-hosted videos under `/video/...` (MP4 + poster JPG)
- Built-in cookie consent panel and a "Cookie preferences" re-open control

## 2. Route map

### English
| Route | Template | Notes |
|---|---|---|
| `/en` | Home | 13 scenes, ~18,700px tall at 1440w |
| `/en/work` | Work wall | "Image archive" eyebrow, H1 "Work", 3 filter groups, mixed image/video masonry wall, ~60 tiles, no per-tile links |
| `/en/case-studies` | Case index | Filter by discipline with counts, horizontal slider "01 / 07", list cloned ×3 for looping |
| `/en/case-studies/[slug]` | Case study | 7 entries: archinspired, tschoeppe-industries, store-et-rideaux, harmony-homes, casanova-paris, clos-des-saumanes, teodor-vanities |
| `/en/expertise` | Expertise index | H1 + hero image + 4 alternating discipline rows |
| `/en/expertise/[slug]` | Discipline | architecture-real-estate, product-3d, brand-graphic-design, web-digital |
| `/en/studio` | About | Hero video, manifesto, 4-step process, disciplines, brief CTA |
| `/en/newsroom` | Blog index | H1 + intro + 18 article rows (thumb, `DD.MM.YY`, title). No categories, search, or pagination |
| `/en/newsroom/[slug]` | Article | Not yet inspected |
| `/en/visual-signature` | Publication | Not yet inspected |
| `/en/contact` | Contact | 5-step brief wizard + "Prefer email?" |
| `/en/legal`, `/en/privacy` | Legal | Not yet inspected |
| `/en/services/architecture` | — | Responds, but the content matches the `/en/expertise/architecture-real-estate` template and nothing links to it. Treat as a **legacy alias → redirect**. |

### French (localized slugs)
> Recorded for completeness only. **This build is English-only** (owner's decision): there are no locale prefixes and no French routes. The English paths drop the `/en` prefix, e.g. `/en/work` → `/work`.

| EN | FR |
|---|---|
| `/en/work` | `/fr/realisations` |
| `/en/case-studies` | `/fr/etudes-de-cas` |
| `/en/expertise` | `/fr/expertise` |
| `/en/expertise/architecture-real-estate` | `/fr/expertise/architecture-immobilier` |
| `/en/expertise/product-3d` | `/fr/expertise/produit-3d` |
| `/en/expertise/brand-graphic-design` | `/fr/expertise/marque-design-graphique` |
| `/en/expertise/web-digital` | `/fr/expertise/web-digital` |
| `/en/visual-signature` | `/fr/signature-visuelle` |
| `/en/legal` | `/fr/mentions-legales` |
| `/en/privacy` | `/fr/confidentialite` |
| `/en/studio`, `/en/newsroom`, `/en/contact` | same slug |

Article slugs are fully translated per locale. **Implication:** slugs must be stored per locale in the CMS, not derived.

## 3. Global chrome

**Header** (`header.nav`): `position: fixed`, 84px tall (`--nav-h`), shrinks to 64px on scroll (`--nav-h-scrolled`). Transparent, 57.6px side padding (4vw). It carries `data-ground`, which inverts color per section (ink/paper) *(inferred)*. Left: wordmark logo. Right: `EN / FR` switch (14.7px, 0.14em tracking) and a square menu toggle. There is **no inline desktop nav**; navigation lives in a full-screen menu overlay (`.menu`, opened with a `clip-path: inset()` reveal, rows of `.menu-link`).

**Persistent "studio" block**: Every page repeats the tagline ("…Made to sell."), the email, and the social links. It's part of the menu panel *(inferred from repeated nav markup ×4)*.

**Loader**: A counter "0%" (34px/600) before the first paint transition.

**Page transition**: A `.curtain` fixed overlay *(inferred: wipe between routes)*.

**Footer** (`footer.footer`, 900px = one viewport): a giant uppercase "LET'S TALK" (180px/600) linked to contact, the email (18px/600), three columns (Sitemap / Expertise / Elsewhere, 15px at 0.86 alpha), "© Studio", a square logo, Legal, Privacy, and "Cookie preferences" (12px uppercase label).

**Cookie panel**: fixed bottom-right card, 261px tall. Buttons: "Reject optional cookies" / "Accept all", plus "Choose cookies" and "Privacy policy" links.

**Skip link**: `a.skip-link` → `#content`.

## 4. Homepage scene-by-scene (1440×900)

| # | Class | Top (px) | Height | Content | Motion |
|---|---|---|---|---|---|
| 1 | `section.hero.hero--film` | 0 | 900 (sticky) + 1080 runway | Looping video in a framed window (979×612, 1.6:1) that grows to full-bleed. H1 "Ideas that leave a mark." 110.9px/600, -0.03em, stacked one word per line. Discipline tagline at the bottom (25px, 0.84 alpha) | `.hero__frame` scales to full-bleed while pinned. H1 words rise (origin bottom-left) |
| 2 | `section.statement` | 1980 | 2074 | 110.9px H2 manifesto, word-split. Lead paragraph 26px/0.72 alpha, 544px wide | Word-by-word reveal on scroll *(inferred)* |
| 3 | `section.xp-scene--pinned` (`pin-spacer` 4005) | 4054 | 900 pinned | "Four disciplines. One standard." small H2 (36.7px) top-left. 4 full-bleed `xp-panel`s (image + scrim + 110.9px H3 + 17px tagline) | Pinned ~1000px per panel. Panels cross-fade (opacity/visibility). Media starts at `scale(1.08)` and settles. Content slides from `translateY(-18%)` |
| 4 | `section.figures` | 8059 | 1111 | H2 77.8px. 4 stats: number 83.5px/600, label 12px uppercase +0.14em, footnote 13px/0.44 | Count-up *(inferred)* |
| 5 | `section.reel--pinned` (`pin-spacer` 3227) | 9170 | 900 pinned | Horizontal track: intro "word panel" ("The work. From every angle." 66px + "View all case studies →") then case cards (image/video 662×588, ~1.13:1, title 36.7px, blurb 24px/0.76) | Pinned horizontal scroll (`reel__track` translateX). Word panel fades up 48px |
| 6 | `section.clients.client-wall` | 12397 | 977 | "Trusted by" 80.6px. 3 rows of white logos (contain, ~70–150px wide) | Marquee rows (logos duplicated) |
| 7 | `section.signature` | 13373 | 1177 | "Visual signature" + publication cover + `circle-btn` "Open the publication" (11px label) | — |
| 8 | `section.gateway` | 14551 | 1080 | "See the work" 80.6px, line 24px/0.82, button → work | — |
| 9 | `section.news-scene` | 15631 | 1110 | "Newsroom", "Read all →", `news-strip` of 4 `news-panel`s (date + 36.7px title) | Horizontal strip *(inferred)* |
| 10 | `section.contact-scene` | 16741 | 1028 | "Got a project? Brief us." 121px/600, -0.04em. Body 26px/300/0.72. "Start a project" + email | — |
| 11 | `footer` | 17768 | 900 | see §3 | — |

Section vertical padding is 158–170px (`--section-y: clamp(5rem, 11vw, 11rem)`) and side padding is 57.6px (`--gutter-x`).

## 5. Inner templates (structure from text fetch; geometry pending Phase 1b)

**Expertise detail** (`/en/expertise/product-3d`, same template as architecture): Hero image + H1 → "Why it matters" (tagline H2 + body + feature video) → "Services" (bullet list of 7–12 items + body + 2 images) → "Keep exploring" (other 3 disciplines + "All expertise") → "Case studies and insights" (2 case cards with video + 2 article cards + "All projects") → "See the work" → "Got a project? Brief us." → footer.

**Case study** (`/en/case-studies/archinspired`): H1 + lead + 16:9 video hero → meta (Client, Discipline, Industry, Services, Year) → 3 narrative chapters (short H2 statement + body + 1–2 images, portrait/landscape mix) → "Keep exploring" (3 related cases with video) → CTA. No stats, testimonials, or prev/next.

**Work wall**: Filter groups **Service** (All, Architecture, Product, 3D Modeling, Graphic Design, Marketing Materials), **Deliverable** (All, Still Rendering, Animation, Graphic Design, 3D Integration), and **Industry** (All, Commerce & Retail, Real Estate, Industrial & Manufacturing, Cultural & Institutional, Construction & Building). Tiles are images or muted loop videos. Alt pattern: "[Type] for [Client], [descriptor]". A "0%" progress indicator also appears here.

**Case studies index**: Discipline filter with counts → slider with "01 / 07" counter.

**Studio**: Hero video → H1 "Nothing is accidental." + manifesto + `vision.mp4` + 3 one-liners → "Approach / Process / Start with the right problem." with 4 numbered steps (01 Define, 02 Create, 03 Refine, 04 Deliver) → 4 discipline cards ("Explore →") → brief CTA.

**Contact**: H1 "Your project. Let's talk outcomes." → **5-step brief wizard** (step 1: multi-select disciplines with "Next"; steps 2–5 not visible without interaction) → "Prefer email?" block. No phone, address, or map. Replies in EN/FR.

**Newsroom index**: H1 + intro line + vertical list of 18 rows (thumbnail, `DD.MM.YY`, title).

## 6. Design tokens (extracted verbatim from `:root`)

**Color.** Pages render as a **black "ink" canvas with white text**; the `:root` palette is the paper (light) theme, inverted per section via `data-ground`.
- `--black #000`, `--white #FFF`, `--ink-hi #111`, `--charcoal #1A1A1A`
- Accent `--blue #17299C`, `--blue-hi #3A4CC0`, `--blue-lo #101E76` (buttons, selection)
- Text-on-ink alphas observed: 0.90, 0.86, 0.84, 0.82, 0.78, 0.76, 0.72, 0.64, 0.56, 0.50, 0.44
- Lines on ink: white 18% / 34%

**Type.** A single family, **Source Sans Pro** (300/400/600/700, plus italics).
| Token | Value |
|---|---|
| `--fs-display` | `clamp(3rem, 7.7vw, 8.5rem)` → 110.9px @1440 |
| `--fs-title` | `clamp(2.25rem, 5.6vw, 6.25rem)` → 80.6px |
| `--fs-statement` | `clamp(2rem, 4.6vw, 5rem)` → 66px |
| `--fs-subtitle` | `clamp(1.5rem, 2.55vw, 2.625rem)` → 36.7px |
| `--fs-heading` | `clamp(1.2rem, 1.95vw, 1.875rem)` |
| `--fs-lead` | `clamp(1.25rem, 1.05rem + .8vw, 1.625rem)` → 26px |
| `--fs-reading` | `clamp(1.125rem, .9rem + .75vw, 1.5rem)` → 24px |
| `--fs-body` | 1.0625rem (17px) |
| `--fs-body-sm` | .9375rem (15px) |
| `--fs-label` | .75rem (12px), uppercase, +0.14em |
| `--fs-micro` | .6875rem (11px) |
| line-heights | .98 / 1.06 / 1.18 / 1.35 / 1.58 / 1.7 |
| tracking | display -0.025em, tight -0.015em, wide .04em, label .14em |

Display headings in practice run at -0.03 to -0.04em with line-height 0.92–1.02, stacked one word per line.

**Space and layout.** Spacing scale 0.25 → 12rem (12 steps). `--section-y: clamp(5rem, 11vw, 11rem)`, `--gutter-x: clamp(1.25rem, 4vw, 6rem)`, `--maxw 1680px`, `--maxw-text 46rem`, 12-col grid with `--grid-gap: clamp(1rem, 2.1vw, 2.5rem)`. Radii 0–3px (essentially square). Nav 84 → 64px.

**Motion.** `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-inout cubic-bezier(.65,0,.35,1)`. Durations 200 / 380 / 640 / 1000ms. Parallax overscan 16% (hero 12%).

**Breakpoints observed** (media queries): 359, 560, 600, 640, 700, 720, 760, 900/901, 1000/1001, 1024, 1200. The primary switch is **900px** (desktop scenes vs. mobile stacks). Rich motion is gated to `(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`. Touch devices and reduced-motion users get the static/stacked versions.

**Media ratios.** Hero frame 1.6:1 (16:10). Discipline panels are full-bleed with object-fit cover. Case reel cards ~1.13:1. Case hero 16:9. Share images 1200×630.

## 7. SEO observations
- Title pattern: `{Page topic} | Lumia` (e.g. "Architectural Rendering & Real Estate Visualization | Lumia")
- OG + Twitter `summary_large_image` (1200×630), `og:locale` with alternate
- Canonical per page. Localized slugs per language.
- Skip link, semantic H1 per page

## 8. What we will *not* reuse
Brand name, logo, wordmark, copy, client names and logos, photography, renders, and videos all belong to the reference owner. The rebuild reproduces **layout, scale, rhythm, and interaction patterns** with configurable branding and our own content. Seed data uses clearly neutral demo content until real content is entered through the CMS.

## 9. Phase 1b findings (inner templates, live DOM/CSS at 1440×900)

Each template was inspected through the desktop browser pane: computed geometry plus the matching CSS rules.

**Global interaction layer**
- **Custom cursor**: a fixed `.cursor` layer with a 12px white dot (`.cursor__particle`). Over media it grows and shows a micro uppercase label ("View"). Disabled for touch and reduced motion.
- **Circle button**: a 1px circle (84px default, 150px for CTAs) with a micro uppercase label. On hover a fill scales from 0 to 1 and the label inverts. The label is magnetic.
- **Menu**: a full-screen black overlay with a 2-column grid (`1fr / .42fr`). On the left is a scrolling wheel of giant links (`min(clamp(3.5rem, 9.4vw, 10.5rem), 15vh)`, grey `#b4b4b4`); hover sweeps a white gradient fill left to right in .75s. The right aside has a 1px divider and holds the tagline, email and socials. The aside is hidden under 1000px.
- **Menu toggle**: a 54px rotated-square SVG outline with bars. On hover the square fills and the bars invert.
- **Header** `data-ground` flips text to black over light (`section--light`) areas.
- **Footer headline**: "LET'S TALK" in `clamp(3.75rem, 12.5vw, 13.5rem)`, centered. Each character rolls on hover (front/back layers). A "Start a project" eyebrow sits above it and the email below it. Underneath are a 12-col nav (cols 1–3 sitemap, 4–6 expertise, 7–8 social, 12 back-to-top circle) and a bottom bar (© · square mark · legal).
- **Light sections**: `section--light` (white/black). Used for case facts and body, expertise editorial, and newsroom.

**Expertise detail** (`chapter` layout, 12 cols): cinema hero (a 979px framed image that grows full-bleed while pinned, with the H1 over it) → dark chapter: the H2 "Why it matters" in cols 1–4, the lead (66px/400) and body (24px/0.72) in cols 5–12, a 1325×900 feature video, then H2 "Services" with a 2-column list of 36.7px items in cols 5–12 → light chapter: a 66px editorial statement, a note (24px/0.62), and a 4:5 image pair → `whats-next` lists ("Keep exploring", "Case studies and insights"): 102px rows with a 1px rule, a 36.7px title, a meta label and →. A **fixed hover preview** (`work-preview`, 16:9, 44vw) follows the cursor → gateway (16:9 media panel, scrim, 80px title, 150px circle CTA) → brief CTA → footer.

**Case study**: cinema hero → light `case-facts` (label/value pairs, 3 cols each: Client, Discipline, Industry, Services, Year) → `case-open` statement (66px/600) → `case-body` with chapters (`case-chapter`: heading cols 1–4 at 80px, prose cols 7–12 at 24px/0.55), full-bleed 4:3 images with parallax overscan, image rows (3:2 + 1:1), a centered portrait (4:5) → `whats-next` related cases → footer.

**Work** (`work-archive`): a 2-col grid (`clamp(13rem, 17vw, 19rem)` filter rail / wall). Three filter groups appear as vertical uppercase 12px lists, with the active item in the accent color. The wall is a **CSS-columns masonry** (3 columns, 2 at ≤1200px, 1 at ≤640px, 2–6px gaps). Tiles are `button`s with aspect ratios 4/5, 3/2, 1/1 or 16/9, scale to 1.04 on hover, and show ▶ badges for video. Clicking a tile opens a **lightbox** with prev/next, a caption, and a link to the case study.

**Case studies index** (`cases`): a full-screen sticky stage. A vertical wheel of giant titles (`clamp(3rem, 8.4vw, 10rem)`, -0.045em) fades with distance. Hovering a title cross-fades a full-bleed preview image/video behind it and flips the stage to dark. The left rail has discipline filters with counts and an underline mark. A "01 / 07" counter sits bottom right.

**Studio**: cinema hero → `studio-intro` (two 66px statements, the second right-aligned, 130svh) → `vision` (pinned 16:9 film with 3 statements placed left/right/left) → `method` (pinned: eyebrow "Approach", title "Process", intro; 4 steps in a 4-col grid with a progress rule and numbered marks) → `disciplines` strip (4 flex panels: hovered panel grows to 2.7, vertical edge label, copy fades in) → brief CTA.

**Contact**: `contact-intro` (100svh, 107px H1 in cols 1–10, lead) → `contact-paths` (brief cols 1–5 with a circle "Start a project"; email cols 7–12 at 36.7px with an underline) → **5-step brief** (a sticky aside in cols 1–5: "Step n of 5", a progress bar, the step title and hint; fields in cols 7–12):
1. Disciplines (multi-select, large choices with descriptions)
2. Services per selected discipline (multi-select plus "Not sure yet")
3. Project: name (optional), description (required), goals, deliverables, reference URL
4. Budget (6 radios), timeline (5 radios), project stage (4 radios, optional), files link
5. Name*, email*, company, phone, location, preferred contact (email/phone/video), notes

A hidden "Website" honeypot field is present on every step. Choices are custom radio/check marks that fill with the accent color.

**Newsroom**: a **light** page (white). Intro H1 at 80px with a 26px lead, then a list. Articles use `article-lede`, `prose` (24px/1.72, H2 66px), figures (medium/wide/full, pair, gallery), splits, a statement, and a signature block.

**Legal**: a light page with a sticky TOC in cols 1–3 and sections in cols 5–12.
