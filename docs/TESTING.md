# Testing

Four layers, all runnable locally and in CI.

| Suite | Tool | Command | What it covers |
|---|---|---|---|
| Unit and integration | Vitest + Testing Library | `npm test` | Section registry and schemas, contact-brief validation, rich-text renderer, SEO lint, media URLs, passwords, preview tokens, RBAC defaults, sanitising of CMS values, and real-database tests (migrations, constraints, cascades, relations) |
| End to end | Playwright | `npm run test:e2e` | Public routes, navigation, menu focus trap, filters, lightbox, contact brief, SEO surface, motion vs reduced motion, responsive overflow; the admin for every content type, media, SEO, redirects, settings, navigation, submissions, RBAC, preview |
| Geometry vs reference | Playwright | `npm run test:visual` | Typography and layout of eight pages measured against probes taken from the reference site |
| Pixel regression | Playwright `toHaveScreenshot` | `npm run test:visual` | 7 pages × 5 viewports of this site |

## Setup

1. PostgreSQL running locally, plus a **separate** test database:
   ```bash
   createdb studio_test
   ```
2. In `.env`: `TEST_DATABASE_URL=postgresql://…/studio_test?schema=public`. Both the unit DB tests and Playwright **wipe and reseed** this database. Never point it at real data.
3. Playwright browsers: tests use the installed Google Chrome (`PW_CHANNEL=chrome`). On machines without Chrome run `npx playwright install chromium` and set `PW_CHANNEL=chromium`.

## How Playwright runs

`playwright.config.ts` starts its own server: it resets the test database, applies migrations, seeds the demo content (fast mode: smaller media), runs `next build`, and starts `next start` on port 3100. The whole run takes about 8 minutes on the build machine.

- `npx playwright test`: everything. The visual project runs first because it needs untouched seed content; the e2e project then creates and edits content.
- `E2E_SKIP_BUILD=1`: reuse the last build (the database is still reseeded). Pages cached by the previous run's ISR are reused too, so use this only for e2e iterations, not for the visual project.
- If something already listens on `E2E_PORT`, Playwright reuses it (outside CI).
- Reports: `npx playwright show-report tests/report`. Failure traces, screenshots and videos are kept.

### Updating visual baselines

```bash
npx playwright test --project=visual --update-snapshots
```

Review the changed PNGs in `tests/visual/screens.spec.ts-snapshots/` before committing them. Baselines are rendered with reduced motion and with image and video pixels replaced by flat grey, so swapping demo media in the CMS does not break them. Text over media stays visible.

## Visual QA against the reference

The brief asked for screenshot comparisons with the reference site. What was possible, and what was done instead:

- The build sandbox cannot reach the reference site (HTTP 403), so it was inspected through the desktop app's browser pane.
- That pane was hidden during the session. In a hidden pane `requestAnimationFrame` is paused and screenshots come out at the wrong scale, so **reference pixel screenshots could not be captured reliably**. No screenshots were produced or edited to stand in for them.
- Instead, the reference DOM was measured with a probe that records, for each key element: font size, line-height ratio, weight, letter-spacing, x position, width, padding-top, padding-left and height. Probes were taken on home, case study, service, contact, work, studio and newsroom at 1440×900, and home at 390×844. They are saved in `tests/visual/reference/*.json`.
- `tests/visual/geometry.spec.ts` runs the same probe on this site (selectors mapped in `geometry.map.ts`) and asserts each field within tolerance:

  | Field | Tolerance |
  |---|---|
  | Font size | ±3% |
  | Line height | ±0.05 |
  | Weight | exact |
  | Tracking | ±0.008 em |
  | x | ±12 px |
  | Width | ±4% (min 16 px) |
  | Paddings | ±10% / ±8 px |

  Fields that depend on the copy are reported but not asserted: widths of shrink-wrapped titles, element heights (line wrapping), marquee positions. The diff report is written to `tests/visual/out/geometry-report.md`.
- Fixes made from this comparison:
  - newsroom rebuilt as a four-column card grid;
  - case-chapter heading span (5 → 4 columns);
  - case-facts top padding;
  - full-width case opening statement;
  - work rail padding;
  - service chapter body measure and line height;
  - capability item padding;
  - contact lead line height;
  - newsroom heading line height and tracking;
  - circle-button label metrics;
  - vision statement measure;
  - figure values on phones (14vw);
  - footer bottom type.
- The hero titles on cinematic pages are mid-animation in a hidden pane, so their positions were not used.

To compare pixels yourself on a machine that can open the reference, capture both sites at the same viewports in a visible browser and diff them. Treat differences in copy and imagery as expected, because the content is intentionally different.

## Latest results

Run on 2026-11-09 against a production build (`next build && next start`), Node 22.23, Chrome for Testing 153, PostgreSQL 16.

| Suite | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 problems |
| `npm test` (Vitest) | **78 / 78 passed** (4 files, including 8 real-database tests and reverse-proxy URL handling) |
| `npx playwright test` | **91 / 91 passed**: 8 geometry comparisons, 35 pixel baselines (7 pages × 5 viewports), 48 e2e tests |
| Same suite against the **standalone** server (`NEXT_OUTPUT=standalone`, as Hostinger builds it), bound to `0.0.0.0` | **91 / 91 passed** (2026-11-10) |

### Lighthouse

Lighthouse 13.6, production build served locally, full-size demo media. Mobile uses Lighthouse's default simulated Moto G Power profile with slow-4G throttling; desktop uses `--preset=desktop`. Mobile performance is the **median of 3 runs** (range in brackets). Runs where Lighthouse failed to record a trace (`NO_NAVSTART`) were excluded. The other categories were identical in every run.

| Page | Mobile perf | Desktop perf | Accessibility | Best practices | SEO | Mobile LCP (range) | Mobile TBT (range) | CLS |
|---|---|---|---|---|---|---|---|---|
| Home | 89 (87–91) | 98 | 100 | 100 | 100 | 1.0–3.1 s | 190–420 ms | 0 |
| Work | 93 (92–93) | 98 | 100 | 100 | 100 | 2.6–2.8 s | 200–220 ms | 0 |
| Case study | 93 (93–96) | 98 | 100 | 100 | 100 | 1.0–1.1 s | 190–290 ms | 0 |
| Service | 94 (92–95) | 100 | 100 | 100 | 100 | 1.0–2.8 s | 150–330 ms | 0 |
| Studio | 96 (93–98) | 98 | 100 | 100 | 100 | 1.0–1.1 s | 150–300 ms | 0 |
| Newsroom | 96 (92–99) | 100 | 100 | 100 | 100 | 1.0–1.1 s | 120–320 ms | 0 |
| Article | 95 (91–96) | 100 | 100 | 100 | 100 | 1.0–1.1 s | 220–360 ms | 0 |
| Contact | 87 and 98 (2 valid runs) | 100 | 100 | 100 | 100 | 1.1–2.9 s | 140–350 ms | 0 |

Targets were performance 90+, accessibility 90+, best practices 95+ and SEO 95+.
- Met on every page for desktop, and for accessibility, best practices and SEO on mobile.
- Mobile performance on the **home page is just under target (median 89)**. Its cost is hydration of the most motion-heavy page plus the GSAP runtime, on a 4× throttled CPU.
- Mobile scores in this container vary by ±5 between identical runs, so re-measure on your own hardware or with PageSpeed Insights after deployment.

Before the Phase 12 optimisations the same setup measured home mobile 75, best practices 96, and accessibility 96–97 on four templates.

## Known limitations

- The Cloudinary media driver could not be exercised (no network access to Cloudinary from the build sandbox). The local driver is fully tested.
- SMTP delivery was not tested against a real server. Without `SMTP_URL`, notifications are written to the log, and the e2e suite verifies that briefs are stored.
- Lighthouse and the visual suites ran in a Linux container. Font rasterisation differs slightly on macOS and Windows, so regenerate pixel baselines on the machine or CI image that will run them.
