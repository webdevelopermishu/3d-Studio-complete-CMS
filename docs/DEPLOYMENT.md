# Deployment

The site is a standard Next.js 15 Node.js application with a PostgreSQL database and a media store. Any host that runs `npm run build && npm start` works. Two setups are described below.

## Requirements

| | Minimum | Notes |
|---|---|---|
| Node.js | 20 or 22 (LTS) | Built and tested on 22.23 |
| PostgreSQL | 14+ | Tested on 16. Managed options: Neon, Supabase, RDS, Render, Railway |
| Media | Persistent disk **or** a Cloudinary account | See "Media storage" |
| Optional | `ffmpeg` + `ffprobe` on the server | With the local driver, video uploads then get their duration and an automatic poster frame. Without them, uploads still work and you can pick a poster image manually |
| Optional | SMTP credentials | Email notifications for new contact briefs. Without them, briefs are still saved to the admin inbox |

## Environment variables

Copy `.env.example` and fill it in. The required ones in production:

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`: the public origin, e.g. `https://studio.example.com`. It is **baked into the build** (canonical URLs, sitemap, Open Graph), so rebuild when it changes.

> **The database must be reachable during `npm run build`.** The home page, the three index pages and the sitemap are pre-rendered at build time from the CMS (then refreshed by ISR and on every publish). A build without database access fails with a Prisma connection error. Run migrations before building.
- `SESSION_SECRET`: 32+ random characters. Changing it invalidates preview links (sessions are unaffected).
- `MEDIA_DRIVER` plus either `LOCAL_UPLOAD_DIR` (on a persistent volume) or `CLOUDINARY_URL`.

## First deployment

```bash
npm ci
npm run db:migrate                 # apply SQL migrations (safe to run on every deploy)
npm run db:seed -- --no-demo       # roles + permissions (and the admin from ADMIN_EMAIL/ADMIN_PASSWORD if both are set)
npm run admin:create -- --email you@studio.com --name "Your Name"   # prompts for a password
npm run build
npm start                          # listens on $PORT (default 3000)
```

To launch with the demo content instead (useful for a staging review), run `npm run db:seed` without `--no-demo` on an empty database. All demo content is ordinary CMS content: edit or delete it in the admin.

## Every later deployment

```bash
npm ci
npm run db:migrate
npm run build
npm start      # or restart your process manager
```

`db:migrate` takes a PostgreSQL advisory lock, so two instances starting at once cannot apply the same migration twice. Run it before the new build starts serving.

## Option A: a Node host with a persistent disk (VPS, Docker, Render, Railway, Fly.io)

Recommended when you want to keep media on your own infrastructure.

1. Provision PostgreSQL and a persistent volume, e.g. mounted at `/data`.
2. Set `MEDIA_DRIVER=local` and `LOCAL_UPLOAD_DIR=/data/uploads`. Uploaded originals and the resized variants cached by `/media/*` both live there.
3. Put a reverse proxy or CDN in front (Caddy, Nginx, Cloudflare). Responses from `/media/*` carry `Cache-Control: public, max-age=31536000, immutable`, so the CDN can cache them.
4. Run with a process manager (systemd, PM2, the platform's own) and set `NODE_ENV=production`.

A minimal Dockerfile. Because the build reads the database (see above), it builds when the container starts, after migrating. This adds a few minutes to each start but works without database access at image-build time:

```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# DATABASE_URL, NEXT_PUBLIC_SITE_URL, SESSION_SECRET, MEDIA_DRIVER, LOCAL_UPLOAD_DIR come from the runtime environment.
CMD ["sh", "-c", "npm run db:migrate && npm run build && npm start"]
```

If your CI can reach the database while building the image, move `npm run build` into a `RUN` step instead (pass `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL` as build arguments, e.g. with `docker build --network host`), and start with `npm run db:migrate && npm start`.

Mount the volume at the path in `LOCAL_UPLOAD_DIR`.

## Option B: Vercel (or another serverless host) + Cloudinary

Serverless functions have no persistent disk, so use `MEDIA_DRIVER=cloudinary`.

1. Create the project from the repository. Install command `npm ci`. Build command `npm run db:migrate && npm run build`: migrations run first, and the build needs the database anyway.
2. Set the environment variables for Production (and Preview, with a separate database).
3. Use a pooled connection string for `DATABASE_URL` (Neon's pooled host, Supabase's pooler) and set `DATABASE_POOL_MAX=3` or lower. Set `DIRECT_DATABASE_URL` to the provider's direct (non-pooled) connection string: migrations use it, because they need a session-level lock that transaction poolers don't support.
4. Preview deployments should use their own database (set a different `DATABASE_URL` for the Preview environment), because every build runs migrations against the database it is given.
5. Preview deployments (`VERCEL_ENV=preview`) automatically serve `robots.txt` with `Disallow: /`.

> **Not verified here:** the Cloudinary driver is implemented against the official SDK, but it could not be exercised from the build environment, which has no access to Cloudinary's API. Test one upload, replacement and deletion on staging before going live.

## Option C: Hostinger Node.js Web App (Business or Cloud plan)

Hostinger hosting includes MySQL only, and this app runs on PostgreSQL, so the database lives with an external provider. Hostinger supports Node.js apps connecting to external PostgreSQL databases.

**1. Create the database (Neon, free plan)**
- Create a Neon project in the region closest to your Hostinger server (hPanel shows the server location in the hosting plan details).
- Copy the **direct** connection string (not the "pooled" one). It looks like:
  `postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require`

Neon's certificates are signed by a public CA, so `sslmode=require` works as is. Supabase also works, but needs more care:
- its direct host is IPv6-only, so you would use the session pooler on port 5432;
- node-postgres rejects its certificate chain unless you install Supabase's CA;
- free projects pause after a week of low activity.

**2. Build settings** (deploy screen → *Build and output settings* → *Change*)

| Field | Value |
|---|---|
| Framework preset | Next.js |
| Node version | 22.x |
| Root directory | `./` |
| Build script | `build:deploy`: applies migrations, seeds roles, the first admin and (on an empty database) the demo content, then builds |
| Output directory | `.next` (keep the default) |

Hostinger always builds Next.js apps with `output: "standalone"`. This project is tested in that mode; `next.config.ts` ships the Prisma file the standalone server needs.

**3. Environment variables**

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (no trailing slash) |
| `SESSION_SECRET` | 64 random hex characters (see below) |
| `MEDIA_DRIVER` | `local` |
| `LOCAL_UPLOAD_DIR` | an absolute path **outside** the deployed app, e.g. `/home/u123456789/domains/your-domain/storage/uploads` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first admin account (password 10+ characters). Created only if that email doesn't exist yet |
| `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING` | `1` |
| `DATABASE_POOL_MAX` | `5` |
| `SEED_DEMO` | optional: `false` to start with an empty site instead of the demo |

Remove `TEST_DATABASE_URL` if it was imported; it is only for tests.

About `LOCAL_UPLOAD_DIR`: each deployment replaces the app folder (`~/domains/your-domain/nodejs`), so uploads must live elsewhere. The usual home folder is `/home/<your hosting username>` (the `u…` prefix shown on the Databases page); confirm the exact path in File Manager.

To generate the session secret, open any browser's developer console and run:

```js
[...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("")
```

**4. Deploy and check**
1. The build log should show `applied … migration(s)`, `admin user created`, `demo content created` (first deploy only), then the Next.js build.
2. Open `https://your-domain/api/health`. It should return `{"ok":true,"db":"up",…}`.
3. File Manager → `domains/your-domain/storage/uploads` should contain the demo images.
4. Sign in at `/admin`. Then remove `ADMIN_PASSWORD` from the environment variables; it is not needed after the account exists.

**Notes**
- Without `ffmpeg` on the server, the demo seed skips the sample videos. Video uploads still work; pick a poster image in the media library.
- Later deployments run the same build script. Migrations apply only once, the admin isn't recreated, and the demo content is only created when the database is empty.
- Back up the database from Neon's console and keep periodic `pg_dump` exports. Back up the uploads folder from File Manager.

## Media storage

| Driver | Where files go | Delivery |
|---|---|---|
| `local` | `LOCAL_UPLOAD_DIR` | `/media/<key>?w=<width>`: resized with sharp, AVIF or WebP chosen from the browser's `Accept` header, cached on disk, byte-range support for video |
| `cloudinary` | Cloudinary, under `CLOUDINARY_FOLDER` | Cloudinary URLs with `f_auto,q_auto` and width transforms |

Switching drivers does not move existing files. Media rows remember which provider they live on, so old local files keep working as long as the directory is kept.

## Backups

- **Database**: daily `pg_dump --format=custom "$DATABASE_URL" > backup-$(date +%F).dump`, kept for at least 30 days. Most managed providers also offer point-in-time recovery. Restore with `pg_restore --clean --if-exists -d "$DATABASE_URL" backup.dump`.
- **Media (local driver)**: back up `LOCAL_UPLOAD_DIR`, excluding the `.cache` subfolder (it is rebuilt on demand).
- **Media (Cloudinary)**: enable Cloudinary's backup option, or export the folder periodically.

## Health and logs

- `GET /api/health` returns `200 {"ok":true,"db":"up",…}` when the database answers, `503` otherwise. Use it for uptime checks and load-balancer probes.
- Application events from `src/lib/logger.ts` (contact briefs, failed admin actions, failed uploads, invalid sections) are single-line JSON in production, ready for any log drain.

## Security checklist before launch

- [ ] `SESSION_SECRET` is long, random and different from staging.
- [ ] `ADMIN_PASSWORD` is removed from the production environment after the first admin exists.
- [ ] The site is served over HTTPS (HSTS is sent in production).
- [ ] `NEXT_PUBLIC_SITE_URL` matches the real domain, then rebuild.
- [ ] Settings → Search & social has the real site name, default description and share image.
- [ ] Database backups are running and one restore has been tested.
- [ ] Demo content is replaced or deleted (if the demo seed was used).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Prisma … engine checksum` errors on install | Set `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`. The app uses the JS query compiler and does not need the native engine |
| `migration … was modified after it was applied` | A migration file changed after it ran. Restore the original file; never edit applied migrations. Create a new one with `npm run db:migration:new -- <name>` |
| Images 404 after a redeploy | `LOCAL_UPLOAD_DIR` is not on a persistent volume |
| Canonical URLs show `localhost` | `NEXT_PUBLIC_SITE_URL` was not set at build time; set it and rebuild |
| Build fails with `Error occurred prerendering page "/sitemap.xml"` (Prisma error) | The build could not reach the database. Make `DATABASE_URL` reachable from the build step |
| Content changes do not appear | Publishing revalidates every page immediately. If a CDN sits in front of the app, make sure it respects the app's `Cache-Control` headers instead of caching HTML for long |
