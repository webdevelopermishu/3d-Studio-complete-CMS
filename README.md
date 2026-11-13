# Studio site + CMS

A cinematic, motion-led portfolio website for a creative studio, with its own admin CMS. The visual experience is modelled on a reference studio site (see `docs/REFERENCE_AUDIT.md`), built independently with original copy, generated demo imagery and fully configurable branding.

- **Public site**: home, work wall with filters and lightbox, case studies, expertise pages, studio, newsroom, a five-step contact brief, legal pages. Smooth scrolling, pinned scroll scenes, word-rise headings, page-transition curtain and a custom cursor on desktop; lighter stacked layouts on touch devices and with reduced motion.
- **Admin CMS** at `/admin`: a page builder with 32 typed section types, projects, services, articles, categories, a media library (local disk or Cloudinary), navigation menus, section templates, drafts with preview and revision history, SEO checks and redirects, contact submissions with CSV export, brand settings, users and roles.
- **English only**: no locale prefixes in URLs.

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, GSAP + ScrollTrigger, Lenis, PostgreSQL + Prisma 6, Zod, React Hook Form, Tiptap, Vitest, Playwright.

## Quick start (local)

Requirements: Node.js 20 or 22, PostgreSQL 14+, optionally `ffmpeg` (video posters for the demo).

```bash
cp .env.example .env              # then edit DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:migrate                # create the schema
npm run db:seed                   # roles, the admin from .env, and the demo site (about a minute)
npm run dev                       # http://localhost:3000, admin at http://localhost:3000/admin
```

Start from an empty site instead of the demo with `npm run db:seed -- --no-demo`, then `npm run admin:create` if you didn't set `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run build:deploy` | Migrate, seed (safe to repeat) and build in one step, for hosts that only run a build script (e.g. Hostinger) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm test` | Unit and integration tests (Vitest; the database tests use `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Functional end-to-end tests (Playwright, against a production build and a disposable database) |
| `npm run test:visual` | Geometry comparison with the reference + pixel regression baselines |
| `npm run db:migrate` | Apply pending migrations (`-- --status` to list them) |
| `npm run db:migration:new -- <name>` | Generate a migration from schema changes |
| `npm run db:seed` | Roles, permissions, first admin and demo content (`-- --no-demo` to skip the demo) |
| `npm run db:reset` | Drop and recreate the local database, migrate and seed (refuses in production) |
| `npm run admin:create` | Create an account, or `-- --reset` an existing account's password |

## Documentation

| | |
|---|---|
| [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) | Using the CMS: pages and sections, publishing, media, menus, SEO, submissions, settings, users |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Environments, first and later deployments, Docker, Vercel + Cloudinary, backups, health checks |
| [`docs/SEO_GUIDE.md`](docs/SEO_GUIDE.md) | What is generated automatically, what editors fill in, how to verify |
| [`docs/TESTING.md`](docs/TESTING.md) | Test suites, how to run them, latest results, Lighthouse scores, known limitations |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, data model, section system, rendering, motion, security |
| [`docs/REFERENCE_AUDIT.md`](docs/REFERENCE_AUDIT.md) | Audit of the reference site's structure, layout, typography and motion |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | Build phases and their status |

## Branding

The demo ships as a neutral studio called "Halden" (`SEED_SITE_NAME`). The reference site's name, logo, copy and media are not used. Rename the site, upload your logo and favicon, and set the accent colour and typeface under **Admin → Settings**. Replace the demo projects, services and articles in the admin, or seed with `--no-demo` and start empty.
