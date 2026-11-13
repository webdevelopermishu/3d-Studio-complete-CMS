/**
 * Seed: roles/permissions (always synced), first admin (from env), and — on an empty
 * database — a complete demo site with original placeholder copy and generated imagery.
 *
 *   npm run db:seed              sync roles + admin, add demo content if the DB is empty
 *   npm run db:seed -- --no-demo   roles + admin only (or set SEED_DEMO=false)
 */
import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PERMISSIONS, ROLE_DEFAULTS } from "../src/lib/auth/permissions";
import { hashPassword } from "../src/lib/auth/password";
import { sections as REG, type SectionType, type SectionData } from "../src/sections/registry";
import { renderDemoImage, renderDemoVideo, type DemoKind } from "./demo-media";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const SITE = process.env.SEED_SITE_NAME || "Halden";
const WORD = SITE.toUpperCase();
/** SEED_FAST=1 → half-size images and short videos (CI / e2e). */
const FAST = process.env.SEED_FAST === "1";

// ───────────────────────── helpers ─────────────────────────
type Node = Record<string, unknown>;
const t = (text: string) => ({ type: "text", text });
const p = (text: string): Node => ({ type: "paragraph", content: [t(text)] });
const h = (level: 2 | 3, text: string): Node => ({ type: "heading", attrs: { level }, content: [t(text)] });
const ul = (items: string[]): Node => ({
  type: "bulletList",
  content: items.map((i) => ({ type: "listItem", content: [p(i)] })),
});
const doc = (...content: Node[]) => ({ type: "doc" as const, content });

function sec<T extends SectionType>(type: T, data: Partial<SectionData<T>>) {
  return { type, data: { ...REG[type].defaults(), ...data } as Prisma.InputJsonValue };
}

async function localPut(buffer: Buffer, filename: string, mime: string) {
  // Imported lazily: storage.ts is server-only in the app, but plain Node here.
  const { localDriver } = await import("./seed-storage");
  return localDriver.put({ buffer, filename, mime });
}

async function makeImage(kind: DemoKind, seed: number, alt: string, w = 2400, h = 1500, folderId?: string) {
  if (FAST) [w, h] = [Math.round(w / 2), Math.round(h / 2)];
  const buf = await renderDemoImage(kind, seed, w, h, WORD);
  const stored = await localPut(buf, `${kind}-${seed}.jpg`, "image/jpeg");
  return db.media.create({
    data: {
      kind: "IMAGE", provider: stored.provider, key: stored.key, url: stored.url, filename: `${kind}-${seed}.jpg`,
      mime: "image/jpeg", width: stored.width, height: stored.height, bytes: stored.bytes, blurDataUrl: stored.blurDataUrl,
      alt, title: alt, folderId,
    },
  });
}

async function makeVideo(kind: DemoKind, seed: number, alt: string, folderId?: string) {
  const still = await renderDemoImage(kind, seed, FAST ? 1200 : 2400, FAST ? 750 : 1500, WORD);
  const mp4 = await renderDemoVideo(still, FAST ? 2 : 6, FAST ? "640x400" : "1280x800");
  if (!mp4) return null;
  const poster = await makeImage(kind, seed, `${alt} (poster)`, 2400, 1500, folderId);
  const stored = await localPut(mp4, `${kind}-${seed}-loop.mp4`, "video/mp4");
  return db.media.create({
    data: {
      kind: "VIDEO", provider: stored.provider, key: stored.key, url: stored.url, filename: `${kind}-${seed}-loop.mp4`,
      mime: "video/mp4", width: stored.width ?? 1280, height: stored.height ?? 800, duration: stored.duration ?? 6,
      bytes: stored.bytes, alt, title: alt, posterId: poster.id, folderId,
    },
  });
}

async function seo(title: string, description: string, ogImageId?: string, focusKeyword?: string) {
  return db.sEOSettings.create({ data: { title, description, ogImageId, focusKeyword } });
}

// ───────────────────────── roles & admin ─────────────────────────
async function syncAccess() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  }
  const perms = await db.permission.findMany();
  const byKey = new Map(perms.map((p) => [p.key, p.id]));
  for (const [key, role] of Object.entries(ROLE_DEFAULTS)) {
    const r = await db.role.upsert({
      where: { key },
      update: { name: role.name, description: role.description },
      create: { key, name: role.name, description: role.description },
    });
    // Only seed grants on first creation; afterwards roles are managed in the admin.
    const existing = await db.rolePermission.count({ where: { roleId: r.id } });
    if (existing === 0) {
      await db.rolePermission.createMany({
        data: role.permissions.map((p) => ({ roleId: r.id, permissionId: byKey.get(p)! })),
        skipDuplicates: true,
      });
    }
  }
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (email && password) {
    const admin = await db.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
    const found = await db.user.findUnique({ where: { email } });
    if (!found) {
      await db.user.create({
        data: { email, name: process.env.ADMIN_NAME || "Administrator", passwordHash: await hashPassword(password), roleId: admin.id },
      });
      console.log(`✓ admin user created: ${email}`);
    } else console.log(`· admin user exists: ${email}`);
  } else {
    console.log("· ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user (use npm run admin:create)");
  }
}

// ───────────────────────── demo content ─────────────────────────
async function demo() {
  console.log("→ generating demo media (this takes ~1 min)…");
  const folder = await db.mediaFolder.create({ data: { name: "Demo" } });
  const F = folder.id;

  const img = {
    heroPoster: await makeImage("architecture", 11, "Dusk view of a low modern residence above the water", 2400, 1500, F),
    arch: await makeImage("architecture", 2, "Architectural visualization of a hillside villa at golden hour", 2400, 1500, F),
    product: await makeImage("product", 9, "Studio render of a ceramic bottle on a warm backdrop", 2400, 1500, F),
    brand: await makeImage("brand", 4, "Campaign billboard for a fictional homeware brand", 2400, 1500, F),
    web: await makeImage("web", 5, "Website design shown on a laptop", 2400, 1500, F),
    interior1: await makeImage("interior", 2, "Living room interior with afternoon light", 2400, 1500, F),
    interior2: await makeImage("interior", 8, "Minimal lounge with a window light shaft", 2400, 1800, F),
    interior3: await makeImage("interior", 14, "Quiet reading corner, soft daylight", 1600, 2000, F),
    product2: await makeImage("product", 15, "Bench render with soft studio shadow", 1600, 2000, F),
    product3: await makeImage("product", 21, "Vase render on neutral background", 2000, 2000, F),
    arch2: await makeImage("architecture", 17, "Night render of a low house among pines", 2400, 1500, F),
    arch3: await makeImage("architecture", 23, "Residential block at blue hour", 2400, 1800, F),
    signature: await makeImage("brand", 26, "Cover of the studio's visual signature publication", 2400, 1500, F),
  };

  const vid = {
    hero: await makeVideo("architecture", 11, "Showreel: slow push-in on a waterfront residence", F),
    arch: await makeVideo("architecture", 2, "Animated fly-in of a hillside villa", F),
    product: await makeVideo("product", 9, "Product animation loop", F),
    interior: await makeVideo("interior", 2, "Interior walkthrough loop", F),
    studio: await makeVideo("interior", 8, "Studio vision film", F),
  };

  // Client logos — simple wordmarks rendered as SVG
  const clientNames = ["Verlaine", "Corvo", "Kestrel", "Alba", "Northfield", "Orra", "Tidewater", "Fennwick", "Marlo", "Ostend", "Pellam", "Rivage"];
  const sharp = (await import("sharp")).default;
  const logos = [];
  for (const [i, name] of clientNames.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><text x="300" y="128" text-anchor="middle" font-family="${i % 2 ? "Georgia, serif" : "Helvetica, Arial, sans-serif"}" font-weight="${i % 3 ? 700 : 400}" font-size="${i % 2 ? 84 : 72}" letter-spacing="${i % 3 ? -2 : 8}" fill="#111">${i % 3 === 0 ? name.toUpperCase() : name}</text></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const stored = await localPut(png, `logo-${name.toLowerCase()}.png`, "image/png");
    logos.push(
      await db.media.create({
        data: { kind: "IMAGE", provider: "local", key: stored.key, url: stored.url, filename: `logo-${name}.png`, mime: "image/png", width: 600, height: 200, bytes: stored.bytes, alt: `${name} logo`, folderId: F },
      }),
    );
  }

  // Taxonomies
  const mk = async <T extends "projectCategory" | "deliverable" | "industry">(model: T, names: string[]) => {
    const out: Record<string, string> = {};
    for (const [order, name] of names.entries()) {
      const slug = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = await (db[model] as any).create({ data: { name, slug, order } });
      out[name] = row.id;
    }
    return out;
  };
  const cat = await mk("projectCategory", ["Architecture", "Product", "3D Modeling", "Graphic Design", "Marketing Materials"]);
  const del = await mk("deliverable", ["Still Rendering", "Animation", "Graphic Design", "3D Integration"]);
  const ind = await mk("industry", ["Commerce & Retail", "Real Estate", "Industrial & Manufacturing", "Cultural & Institutional", "Construction & Building"]);

  // Services
  const svcData = [
    {
      title: "Architecture & Real Estate", slug: "architecture-real-estate", cover: img.arch, video: vid.arch,
      tagline: "Let buyers walk in before the walls go up.",
      summary: "Exterior and interior renderings, animation and virtual tours for pre-sales, planning submissions and competitions.",
      offerings: ["Exterior renderings", "Interior renderings", "Virtual staging", "2D and 3D floor plans", "360° panoramas and virtual tours", "Architectural animation", "Interactive configurators"],
      lead: "A plan shows the rooms. An image shows the life inside them.",
      body: "Light, proportion and atmosphere decide how a place feels long before anyone visits. We build each scene from your drawings, then art-direct the hour, the materials and the styling so the project reads clearly to buyers, councils and juries.",
      kw: "architectural rendering",
    },
    {
      title: "Product & 3D", slug: "product-3d", cover: img.product, video: vid.product,
      tagline: "Show every material at its best.",
      summary: "Packshots, lifestyle scenes, 360° spins and animation built from accurate 3D models for stores, catalogs and campaigns.",
      offerings: ["White-background packshots", "Lifestyle scenes", "Technical visuals", "360° product spins", "Product animation", "Web and AR models (glTF, USDZ)", "3D modeling", "Reverse engineering", "Exploded assembly views", "Technical documentation"],
      lead: "The difference is in the grain, the reflection, the stitch.",
      body: "One accurate model serves every channel: e-commerce, print catalogs, configurators and launch films. We match finishes to physical samples and deliver files sized for each use, from web thumbnails to large-format print.",
      kw: "3D product rendering",
    },
    {
      title: "Brand & Graphic Design", slug: "brand-graphic-design", cover: img.brand, video: null,
      tagline: "An identity people recognise at a glance.",
      summary: "Logos, visual identities, packaging, print and campaign design applied consistently across every touchpoint.",
      offerings: ["Logo and visual identity", "Brand guidelines", "Packaging design", "Print and signage", "Campaign visuals", "Social content systems"],
      lead: "Consistency is what turns a logo into a brand.",
      body: "We design identities as working systems: type, colour, imagery and tone that hold together on a box, a billboard and a phone screen. Guidelines are written for the people who will use them every day.",
      kw: "brand identity design",
    },
    {
      title: "Web & Digital", slug: "web-digital", cover: img.web, video: null,
      tagline: "A site that turns visits into conversations.",
      summary: "Structure, design, content and development for websites that make the offer clear and the next step obvious.",
      offerings: ["UX and site structure", "Web design", "Development and CMS", "Content and copywriting", "SEO foundations", "Hosting and care plans"],
      lead: "Every page should answer one question and point to the next.",
      body: "We map what visitors need to know, in the order they need to know it, then design and build the site around that path. Content is managed in a CMS your team can actually use.",
      kw: "web design studio",
    },
  ];

  const services: Record<string, string> = {};
  for (const [order, s] of svcData.entries()) {
    const seoRow = await seo(`${s.title}: ${s.kw.replace(/\b\w/g, (c) => c.toUpperCase())} | ${SITE}`.slice(0, 60), s.summary.slice(0, 155), s.cover.id, s.kw);
    const svc = await db.service.create({
      data: {
        title: s.title, slug: s.slug, tagline: s.tagline, summary: s.summary, offerings: s.offerings, coverId: s.cover.id,
        order, status: "PUBLISHED", publishedAt: new Date(), seoId: seoRow.id,
      },
    });
    services[s.slug] = svc.id;
  }

  // Projects
  type P = {
    title: string; client: string; year: number; service: string; cats: string[]; dels: string[]; inds: string[];
    case?: boolean; featured?: boolean; aspect?: string; kind: DemoKind; seed: number; video?: boolean; summary?: string; lead?: string; location?: string;
  };
  const projects: P[] = [
    { title: "Maison Verlaine", client: "Verlaine Estates", year: 2025, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Still Rendering", "Animation"], inds: ["Real Estate"], case: true, featured: true, kind: "architecture", seed: 31, video: true, location: "Provence, France",
      summary: "A hillside estate presented to buyers eighteen months before completion.", lead: "Selling a house that did not exist yet. We built Maison Verlaine in 3D, room by room, and lit it for the hour buyers would fall for it." },
    { title: "Corvo Outdoor", client: "Corvo", year: 2025, service: "product-3d", cats: ["Product", "3D Modeling"], dels: ["Still Rendering", "3D Integration"], inds: ["Commerce & Retail"], case: true, featured: true, kind: "product", seed: 32, video: true,
      summary: "An outdoor furniture range modelled once and rendered for every channel.", lead: "Forty products, one model library. Corvo's new range launched online, in print and in AR from the same set of files." },
    { title: "Kestrel Quay", client: "Kestrel Developments", year: 2024, service: "architecture-real-estate", cats: ["Architecture", "Marketing Materials"], dels: ["Still Rendering", "Animation"], inds: ["Real Estate", "Construction & Building"], case: true, featured: true, kind: "architecture", seed: 33, video: true, location: "Waterfront district",
      summary: "Pre-sale imagery and a launch film for a waterfront residential scheme.", lead: "A waterfront address needs to feel like one. Every view in Kestrel Quay was framed from a real apartment height and orientation." },
    { title: "Alba Ceramics", client: "Alba", year: 2024, service: "brand-graphic-design", cats: ["Graphic Design", "Product"], dels: ["Graphic Design", "Still Rendering"], inds: ["Commerce & Retail"], case: true, kind: "brand", seed: 34,
      summary: "Identity, packaging and product imagery for a ceramics studio.", lead: "Alba's pieces are made by hand. The identity needed to feel just as considered, from the wordmark to the box." },
    { title: "Northfield Residences", client: "Northfield", year: 2024, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Still Rendering"], inds: ["Real Estate"], case: true, kind: "interior", seed: 35,
      summary: "Interior renderings that gave each apartment type its own character.", lead: "Three apartment types, three moods. Northfield's interiors were staged to help each buyer picture their own routine." },
    { title: "Orra Lighting", client: "Orra", year: 2023, service: "product-3d", cats: ["Product", "3D Modeling"], dels: ["Animation", "Still Rendering"], inds: ["Industrial & Manufacturing"], case: true, kind: "product", seed: 36, video: true,
      summary: "Technical visuals and a launch animation for a modular lamp system.", lead: "A modular system is easier to show than to explain. We animated how Orra's parts fit together." },
    { title: "Tidewater Hotel", client: "Tidewater Group", year: 2023, service: "web-digital", cats: ["Marketing Materials", "Graphic Design"], dels: ["Graphic Design", "3D Integration"], inds: ["Cultural & Institutional"], case: true, kind: "web", seed: 37,
      summary: "A booking-focused website with 3D room previews.", lead: "Guests choose a room by how it looks. Tidewater's new site shows every room in 3D before the booking step." },
  ];
  const wallOnly: Omit<P, "case">[] = [
    { title: "Fennwick Kitchens", client: "Fennwick", year: 2025, service: "product-3d", cats: ["Product"], dels: ["Still Rendering"], inds: ["Commerce & Retail"], kind: "interior", seed: 41, aspect: "4/5" },
    { title: "Marlo Pavilion", client: "Marlo", year: 2025, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Still Rendering"], inds: ["Cultural & Institutional"], kind: "architecture", seed: 42, aspect: "3/2" },
    { title: "Ostend Chair", client: "Ostend", year: 2024, service: "product-3d", cats: ["Product", "3D Modeling"], dels: ["Still Rendering"], inds: ["Industrial & Manufacturing"], kind: "product", seed: 43, aspect: "4/5" },
    { title: "Pellam Campaign", client: "Pellam", year: 2024, service: "brand-graphic-design", cats: ["Graphic Design", "Marketing Materials"], dels: ["Graphic Design"], inds: ["Commerce & Retail"], kind: "brand", seed: 44, aspect: "16/9" },
    { title: "Rivage Lofts", client: "Rivage", year: 2024, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Still Rendering"], inds: ["Real Estate"], kind: "interior", seed: 45, aspect: "4/5" },
    { title: "Hollis Workshop", client: "Hollis", year: 2023, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Still Rendering"], inds: ["Construction & Building"], kind: "architecture", seed: 46, aspect: "3/2" },
    { title: "Sable Vase", client: "Sable", year: 2023, service: "product-3d", cats: ["Product"], dels: ["Still Rendering"], inds: ["Commerce & Retail"], kind: "product", seed: 47, aspect: "1/1" },
    { title: "Linden Site", client: "Linden", year: 2023, service: "web-digital", cats: ["Marketing Materials"], dels: ["Graphic Design"], inds: ["Commerce & Retail"], kind: "web", seed: 48, aspect: "3/2" },
    { title: "Aster House", client: "Aster", year: 2023, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Animation"], inds: ["Real Estate"], kind: "architecture", seed: 49, aspect: "16/9", video: true },
    { title: "Quill Packaging", client: "Quill", year: 2022, service: "brand-graphic-design", cats: ["Graphic Design"], dels: ["Graphic Design"], inds: ["Commerce & Retail"], kind: "brand", seed: 50, aspect: "4/5" },
    { title: "Brenna Studio", client: "Brenna", year: 2022, service: "architecture-real-estate", cats: ["Architecture"], dels: ["Still Rendering"], inds: ["Real Estate"], kind: "interior", seed: 51, aspect: "3/2" },
    { title: "Calder Bench", client: "Calder", year: 2022, service: "product-3d", cats: ["Product", "3D Modeling"], dels: ["Still Rendering", "3D Integration"], inds: ["Industrial & Manufacturing"], kind: "product", seed: 52, aspect: "4/5" },
  ];

  const projectIds: Record<string, string> = {};
  const aspects: Record<string, [number, number]> = { "4/5": [1600, 2000], "3/2": [2400, 1600], "1/1": [2000, 2000], "16/9": [2400, 1350] };
  const all = [...projects.map((x) => ({ ...x, case: true })), ...wallOnly.map((x) => ({ ...x, case: false }))];
  for (const [order, pr] of all.entries()) {
    const aspect = pr.aspect ?? (order % 3 === 0 ? "3/2" : "4/5");
    const [w, hgt] = pr.case ? [2400, 1500] : aspects[aspect];
    const cover = await makeImage(pr.kind, pr.seed, `${pr.title}: ${pr.kind === "architecture" ? "architectural visualization" : pr.kind === "interior" ? "interior rendering" : pr.kind === "product" ? "3D product rendering" : pr.kind === "brand" ? "brand design" : "website design"}`, w, hgt, F);
    const video = pr.video ? await makeVideo(pr.kind, pr.seed, `${pr.title} loop`, F) : null;
    const slug = pr.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const kindLabel = pr.service === "architecture-real-estate" ? "Architectural Visualization" : pr.service === "product-3d" ? "3D Product Rendering" : pr.service === "brand-graphic-design" ? "Brand Identity" : "Web Design";
    const caseTitle = `${pr.title}: ${kindLabel} | ${SITE}`;
    const caseDesc = `${pr.summary ?? ""} See how ${SITE} approached ${pr.client}'s brief, from first model to final images.`.slice(0, 155);
    const seoRow = pr.case ? await seo(caseTitle.length <= 60 ? caseTitle : `${pr.title} | ${SITE}`, caseDesc, cover.id, kindLabel.toLowerCase()) : null;
    const row = await db.project.create({
      data: {
        title: pr.title, slug, client: pr.client, year: pr.year, location: pr.location, summary: pr.summary, lead: pr.lead,
        servicesText: svcData.find((s) => s.slug === pr.service)!.offerings.slice(0, 3).join(", "),
        isCaseStudy: pr.case, showOnWall: true, featured: !!pr.featured, wallAspect: pr.case ? "3/2" : aspect,
        coverId: cover.id, videoId: video?.id, serviceId: services[pr.service], order,
        categories: { connect: pr.cats.map((c) => ({ id: cat[c] })) },
        deliverables: { connect: pr.dels.map((c) => ({ id: del[c] })) },
        industries: { connect: pr.inds.map((c) => ({ id: ind[c] })) },
        status: "PUBLISHED", publishedAt: new Date(), seoId: seoRow?.id,
      },
    });
    projectIds[slug] = row.id;
  }

  // Case-study bodies
  const chapterCopy: Record<string, [string, string, string][]> = {
    "maison-verlaine": [
      ["Light first.", "We studied the site's sun path and chose late afternoon for the hero views: long shadows across the terraces, warm stone, the valley still bright behind.", "The terraces"],
      ["Rooms with a routine.", "Each interior was styled for a moment of the day. Breakfast in the kitchen, reading by the west window, dinner on the terrace. Buyers saw a life, not a floor plan.", "The interiors"],
      ["One film, many cuts.", "The 60-second walkthrough was cut into 15-second social edits and still frames for the brochure, so every channel told the same story.", "The film"],
    ],
    default: [
      ["Start with the brief.", "We listened before we modelled: who needed convincing, what they already knew, and which detail would tip the decision.", "Brief"],
      ["Build it accurately.", "Every dimension came from source files or measured samples. Accuracy is what lets an image carry a sale.", "Model"],
      ["Direct the light.", "Lighting and styling were chosen for the audience, then tested at the sizes the images would actually be seen.", "Light"],
    ],
  };

  const caseImages = [img.interior1, img.interior2, img.interior3, img.product2, img.product3, img.arch2, img.arch3];
  const projectSlugs = Object.keys(projectIds);
  for (const [i, pr] of projects.entries()) {
    const slug = pr.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const copy = chapterCopy[slug] ?? chapterCopy.default;
    const pick = (k: number) => caseImages[(i + k) % caseImages.length].id;
    const others = projectSlugs.filter((s) => s !== slug && projects.some((x) => x.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === s)).slice(i % 3, (i % 3) + 3);
    const list = [
      sec("caseMedia", { media: pick(0), layout: "bleed", ground: "light" }),
      sec("caseChapter", { heading: copy[0][0], body: doc(p(copy[0][1])), ground: "light" }),
      sec("imageRow", { images: [{ media: pick(1), caption: "" }, { media: pick(4), caption: "" }], ground: "light" }),
      sec("caseChapter", { heading: copy[1][0], body: doc(p(copy[1][1])), ground: "light" }),
      sec("caseMedia", { media: pick(2), layout: "portrait", caption: copy[1][2], ground: "light" }),
      sec("caseChapter", { heading: copy[2][0], body: doc(p(copy[2][1])), ground: "light" }),
      sec("caseMedia", { media: pick(5), layout: "bleed", ground: "light" }),
      sec("keepExploring", { title: "Keep exploring", mode: "projects", projects: others.map((s) => projectIds[s]), allLink: { label: "All case studies", href: "/case-studies" } }),
    ];
    await db.pageSection.createMany({
      data: list.map((s, order) => ({ ...s, order, projectId: projectIds[slug] })),
    });
    const created = await db.pageSection.findMany({ where: { projectId: projectIds[slug] }, orderBy: { order: "asc" } });
    await db.project.update({
      where: { id: projectIds[slug] },
      data: { publishedSections: created.map((s) => ({ id: s.id, type: s.type, enabled: s.enabled, data: s.data })) as Prisma.InputJsonValue },
    });
  }

  // Articles
  const admin = await db.user.findFirst({ where: { role: { key: "ADMIN" } } });
  const articles = [
    { title: "Pre-sale renders: what a buyer needs to see", slug: "pre-sale-renders-what-buyers-need", date: "2026-10-28", svc: "architecture-real-estate", cover: img.arch2,
      excerpt: "The five views that do most of the selling, and the ones you can skip.",
      body: doc(p("Off-plan buyers are asked to commit to something they cannot visit. The images carry the weight a show home would normally carry, so each one has to answer a specific question."), h(2, "Start with the arrival"), p("The first view should show what it feels like to approach the building: the street, the entrance, the landscaping at eye level. Aerials are useful for context but rarely make anyone want to live somewhere."), h(2, "Show the main living space at its best hour"), p("Pick the time of day that flatters the orientation and stick to it across the set. Consistent light makes a series feel like one place."), h(2, "What you can skip"), ul(["A view of every bedroom — one well-styled bedroom represents them all.", "Night shots of interiors — they rarely help a daytime decision.", "Extreme wide angles — buyers notice when rooms look larger than the plan."]), p("Five strong views usually outperform fifteen average ones.")) },
    { title: "How much does a 3D product render cost?", slug: "3d-product-render-cost", date: "2026-09-12", svc: "product-3d", cover: img.product3,
      excerpt: "What drives the price of product imagery, and how to brief for the budget you have.",
      body: doc(p("Product rendering prices vary widely because the work behind them varies widely. Here is what actually moves the number."), h(2, "The model is the main cost"), p("Building an accurate 3D model takes the most time. Once it exists, extra angles and colourways are comparatively cheap, which is why ranges are more economical than single products."), h(2, "Materials and accuracy"), p("Matching a finish to a physical sample takes iteration. Supplying samples or manufacturer references early saves rounds later."), h(2, "Scenes versus packshots"), p("White-background packshots are the most efficient. Lifestyle scenes add set design, props and styling, and are priced accordingly.")) },
    { title: "Render farm or new workstation?", slug: "render-farm-or-workstation", date: "2026-07-03", svc: "product-3d", cover: img.interior2,
      excerpt: "A practical comparison for small studios deciding where to spend.",
      body: doc(p("Every growing studio hits the same question: buy faster hardware, or rent render time when deadlines stack up?"), h(2, "When a workstation wins"), p("If you render daily and iterate interactively, local performance pays back quickly. Look-dev speed matters more than final-frame speed."), h(2, "When a farm wins"), p("Animations and peak weeks favour the farm. You pay only for the frames you need, and your workstation stays free for the next job.")) },
    { title: "Why visual consistency compounds", slug: "why-visual-consistency-compounds", date: "2026-05-19", svc: "brand-graphic-design", cover: img.brand,
      excerpt: "Small, repeated decisions are what make a brand recognisable.",
      body: doc(p("Recognition is built through repetition. Every time a customer sees the same colours, type and tone, the brand gets a little cheaper to remember."), h(2, "Write it down"), p("Guidelines don't need to be long. They need to be specific enough that two different designers make the same choice.")) },
    { title: "Packshots for e-commerce: a checklist", slug: "packshots-for-ecommerce-checklist", date: "2026-03-08", svc: "product-3d", cover: img.product,
      excerpt: "Angles, sizes and file formats to agree before the first render.",
      body: doc(p("A short checklist to agree with your e-commerce team before production starts."), ul(["Platform image ratios and minimum sizes", "Background colour (pure white or off-white)", "Shadow style: none, contact or soft", "Angles per product: front, three-quarter, back, detail", "Colourways and naming convention for files"])) },
    { title: "From brief to final frame", slug: "from-brief-to-final-frame", date: "2026-01-22", svc: "web-digital", cover: img.interior1,
      excerpt: "How a project moves through our studio, step by step.",
      body: doc(p("Clients often ask what happens between sending a brief and receiving final images. Here is the path most projects follow."), h(2, "Define"), p("We confirm audience, use and constraints, then agree scope and schedule."), h(2, "Create and refine"), p("First proposals arrive as low-resolution clay or draft renders, so decisions are made early and cheaply."), h(2, "Deliver"), p("Final files are exported for each channel: web, print, presentation or production.")) },
  ];
  for (const a of articles) {
    const seoRow = await seo(`${a.title} | ${SITE}`.length <= 60 ? `${a.title} | ${SITE}` : a.title, `${a.excerpt} A practical guide from the ${SITE} studio.`.slice(0, 155), a.cover.id);
    await db.article.create({
      data: {
        title: a.title, slug: a.slug, excerpt: a.excerpt, body: a.body as Prisma.InputJsonValue, coverId: a.cover.id,
        authorId: admin?.id, status: "PUBLISHED", publishedAt: new Date(a.date + "T09:00:00Z"), seoId: seoRow.id,
        services: { connect: [{ id: services[a.svc] }] },
      },
    });
  }
  const articleRows = await db.article.findMany({ orderBy: { publishedAt: "desc" } });

  // Service page sections
  for (const s of svcData) {
    const sid = services[s.slug];
    const rel = Object.entries(projectIds).filter(([slug]) => projects.some((pp) => pp.service === s.slug && pp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug)).map(([, id]) => id).slice(0, 2);
    const relArticles = articleRows.filter((a) => articles.find((x) => x.slug === a.slug)?.svc === s.slug).map((a) => a.id).slice(0, 2);
    const list = [
      sec("chapter", { heading: "Why it matters", lead: s.lead, body: doc(p(s.body)), media: (s.video ?? s.cover).id, ground: "dark" }),
      sec("servicesList", { heading: "Services", items: [], ground: "dark" }),
      sec("editorial", { text: "Your project has several audiences. Each one deserves an image made for it.", note: "Investors, buyers, planners and press read images differently. We plan the set so each audience gets the view it needs, from the same accurate model.", imageA: img.interior3.id, imageB: img.product2.id, ground: "light" }),
      sec("keepExploring", { title: "Keep exploring", mode: "services", allLink: { label: "All expertise", href: "/expertise" } }),
      sec("caseInsights", { title: "Case studies and insights", projects: rel, articles: relArticles, allLink: { label: "All projects", href: "/work" } }),
      sec("gateway", { media: (vid.interior ?? img.interior1).id }),
      sec("briefCta", {}),
    ];
    await db.pageSection.createMany({ data: list.map((x, order) => ({ ...x, order, serviceId: sid })) });
    const created = await db.pageSection.findMany({ where: { serviceId: sid }, orderBy: { order: "asc" } });
    await db.service.update({ where: { id: sid }, data: { publishedSections: created.map((x) => ({ id: x.id, type: x.type, enabled: x.enabled, data: x.data })) as Prisma.InputJsonValue } });
  }

  // Pages
  const featuredCases = projects.filter((x) => x.featured).map((x) => projectIds[x.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")]);
  const pages: { slug: string; title: string; system: boolean; seo: [string, string, string?]; sections: ReturnType<typeof sec>[] }[] = [
    {
      slug: "", title: "Home", system: true,
      seo: [`${SITE} | 3D Rendering Studio for Architecture & Brands`, "Architectural visualization, 3D product rendering, brand identities and websites, made to help your clients choose you.", "3D rendering studio"],
      sections: [
        sec("heroFilm", { title: "Ideas that leave a mark.", subtitle: "Architecture · Product · Brand · Web", video: vid.hero?.id ?? null, image: img.heroPoster.id }),
        sec("statement", { title: "Getting noticed is the start. Being chosen is the point.", body: "Architectural visualization, 3D product rendering, brand identities and websites. Each one built to earn attention, then help people decide." }),
        sec("disciplineScene", { title: "Four disciplines. One standard.", services: [], linkLabel: "Explore" }),
        sec("figures", {
          title: "The work speaks. So do the numbers.",
          items: [
            { value: "450", prefix: "", suffix: "+", label: "Projects delivered", note: "" },
            { value: "300", prefix: "Up to +", suffix: "%", label: "Conversion lift reported on visualized products", note: "Client-reported, varies by project" },
            { value: "100", prefix: "", suffix: "+", label: "Clients in 18 countries", note: "" },
            { value: "4", prefix: "", suffix: "", label: "Complementary disciplines", note: "40+ specialised services" },
          ],
        }),
        sec("caseReel", { projects: featuredCases }),
        sec("clientWall", { eyebrow: "Clients", title: "Trusted by", rows: 2, logos: logos.map((l, i) => ({ name: clientNames[i], logo: l.id })) }),
        sec("featurePanel", { eyebrow: "Publication", title: "Visual signature", body: "A short book on how we light, frame and finish an image.", media: img.signature.id, link: { label: "Open the publication", href: "/visual-signature" } }),
        sec("gateway", { media: (vid.interior ?? img.interior1).id }),
        sec("newsStrip", {}),
        sec("briefCta", {}),
      ],
    },
    { slug: "work", title: "Work", system: true, seo: [`3D Rendering Portfolio & Design Work | ${SITE}`, "Browse renderings, animations and design work by service, deliverable and industry, from architecture to products.", "3D rendering portfolio"], sections: [sec("workWall", {})] },
    { slug: "case-studies", title: "Case studies", system: true, seo: [`Rendering Case Studies | ${SITE}`, "How we approached real projects, from the first brief and model to the final frame, film and launch campaign.", "rendering case studies"], sections: [sec("caseIndex", {})] },
    {
      slug: "expertise", title: "Expertise", system: true, seo: [`3D Rendering Services, Branding & Web | ${SITE}`, "Four disciplines under one standard: architectural visualization, product rendering, brand identity and websites.", "3D rendering services"],
      sections: [sec("pageHero", { title: "Four disciplines. One standard.", media: img.arch.id }), sec("disciplineRows", {}), sec("briefCta", {})],
    },
    {
      slug: "studio", title: "Studio", system: true, seo: [`About the Design Studio | ${SITE}`, `${SITE} is an independent creative studio for architecture, products, brands and the web. Meet the process behind the work.`, "design studio"],
      sections: [
        sec("pageHero", { title: "Nothing here is accidental.", media: (vid.studio ?? img.interior2).id, poster: img.interior2.id }),
        sec("studioIntro", { statements: [`${SITE} is an independent studio working with clients worldwide across architecture, products, brands and the web.`, "One principle runs through all of it: make the right choice obvious."] }),
        sec("vision", { media: (vid.studio ?? img.interior2).id, poster: img.interior2.id, statements: ["Your offer has strengths.", "Our job is to make them visible.", "And give people a reason to choose you."] }),
        sec("method", {
          steps: [
            { title: "Define", body: "We clarify the offer, the audience and the constraints, then agree direction and scope." },
            { title: "Create", body: "Direction becomes concepts and first proposals, shared early and often." },
            { title: "Refine", body: "We test, compare and adjust with your feedback until every detail holds up." },
            { title: "Deliver", body: "Files are prepared for web, print, presentation or production — whatever comes next." },
          ],
        }),
        sec("disciplinesStrip", {}),
        sec("briefCta", {}),
      ],
    },
    { slug: "newsroom", title: "Newsroom", system: true, seo: [`3D Rendering Insights & Guides | ${SITE}`, "Practical guides and studio perspectives on 3D rendering, visual identity and web design, written for clients.", "3D rendering insights"], sections: [sec("articleList", {})] },
    {
      slug: "contact", title: "Contact", system: true, seo: [`Start a Rendering Project | ${SITE}`, "Send a short brief or an email. We reply within two business days with scope, timing and the next steps.", "start a rendering project"],
      sections: [sec("contactIntro", { lead: "Tell us what you are working on. A few lines are enough to start; we come back with scope, timing and a quote." }), sec("contactBrief", {})],
    },
    {
      slug: "visual-signature", title: "Visual signature", system: false, seo: [`Visual Signature: How We Light & Frame | ${SITE}`, "How we light, frame and finish an image: the principles behind every render we deliver, in a short publication.", undefined],
      sections: [
        sec("pageHero", { title: "Visual signature", media: img.signature.id }),
        sec("richText", { heading: "Light, frame, finish.", body: doc(p("This short publication collects the principles behind our images: where we place the camera, how we choose the hour, and what we leave out."), p("It is written for clients who want to understand the choices behind a render, and for teams who brief visual work.")), ground: "light" }),
        sec("imageRow", { images: [{ media: img.interior1.id, caption: "" }, { media: img.product3.id, caption: "" }], ground: "light" }),
        sec("briefCta", {}),
      ],
    },
    {
      slug: "legal", title: "Legal notice", system: true, seo: [`Legal Notice and Terms of Use | ${SITE}`, "Publisher information, hosting details, intellectual property and the terms that apply to using this website.", undefined],
      sections: [sec("legal", {
        title: "Legal notice", intro: "Information about the publisher of this website and the terms that apply to its use.", updated: "Last updated November 2026",
        sections: [
          { heading: "Publisher", body: doc(p(`This website is published by ${SITE}. Replace this paragraph with your registered company name, address and registration number.`)) },
          { heading: "Hosting", body: doc(p("Name and address of the hosting provider.")) },
          { heading: "Intellectual property", body: doc(p("All images, text and designs on this site are protected. They may not be reproduced without written permission.")) },
          { heading: "Liability", body: doc(p("We take care to keep this site accurate but cannot guarantee that all information is complete or current.")) },
        ],
      })],
    },
    {
      slug: "privacy", title: "Privacy policy", system: true, seo: [`Privacy Policy and Cookies | ${SITE}`, "How we collect, use and protect the personal data you share with us, and how cookies are used on this website.", undefined],
      sections: [sec("legal", {
        title: "Privacy policy", intro: "How we handle the personal data you share with us.", updated: "Last updated November 2026",
        sections: [
          { heading: "What we collect", body: doc(p("When you send a brief or an email, we collect the details you provide: name, email, company and project information.")) },
          { heading: "Why we collect it", body: doc(p("Only to reply to your request and, if we work together, to manage the project.")) },
          { heading: "Cookies", body: doc(p("Necessary cookies keep the site working. Optional analytics cookies are only set with your consent, which you can change at any time from \"Cookie preferences\" in the footer.")) },
          { heading: "Your rights", body: doc(p("You can ask to access, correct or delete your data at any time by emailing us.")) },
        ],
      })],
    },
  ];

  for (const pg of pages) {
    const seoRow = await seo(pg.seo[0], pg.seo[1], img.heroPoster.id, pg.seo[2]);
    const page = await db.page.create({
      data: { title: pg.title, slug: pg.slug, system: pg.system, status: "PUBLISHED", publishedAt: new Date(), seoId: seoRow.id },
    });
    await db.pageSection.createMany({ data: pg.sections.map((s, order) => ({ ...s, order, pageId: page.id })) });
    const created = await db.pageSection.findMany({ where: { pageId: page.id }, orderBy: { order: "asc" } });
    await db.page.update({ where: { id: page.id }, data: { publishedSections: created.map((s) => ({ id: s.id, type: s.type, enabled: s.enabled, data: s.data })) as Prisma.InputJsonValue } });
  }

  // Navigation
  const menus: [string, string, [string, string, boolean?][]][] = [
    ["MAIN", "Main menu", [["Work", "/work"], ["Case studies", "/case-studies"], ["Expertise", "/expertise"], ["Studio", "/studio"], ["Newsroom", "/newsroom"], ["Contact", "/contact"]]],
    ["FOOTER_SITEMAP", "Footer — sitemap", [["Work", "/work"], ["Case studies", "/case-studies"], ["Expertise", "/expertise"], ["Studio", "/studio"], ["Newsroom", "/newsroom"], ["Contact", "/contact"]]],
    ["FOOTER_EXPERTISE", "Footer — expertise", svcData.map((s) => [s.title, `/expertise/${s.slug}`] as [string, string])],
    ["SOCIAL", "Social links", [["Instagram", "https://www.instagram.com/", true], ["Behance", "https://www.behance.net/", true], ["LinkedIn", "https://www.linkedin.com/", true]]],
    ["LEGAL", "Legal links", [["Legal notice", "/legal"], ["Privacy", "/privacy"]]],
  ];
  for (const [key, name, items] of menus) {
    await db.navigationMenu.create({
      data: { key, name, items: { create: items.map(([label, href, newTab], order) => ({ label, href, order, newTab: !!newTab })) } },
    });
  }

  // Redirects (legacy URLs)
  await db.redirect.createMany({
    data: [
      { source: "/services/architecture", destination: "/expertise/architecture-real-estate", note: "Legacy service URL" },
      { source: "/services/product", destination: "/expertise/product-3d", note: "Legacy service URL" },
      { source: "/portfolio", destination: "/work", note: "Common alias" },
      { source: "/about", destination: "/studio", note: "Common alias" },
    ],
  });

  // Section templates
  await db.sectionTemplate.createMany({
    data: [
      { name: "Brief CTA (default)", ...sec("briefCta", {}) },
      { name: "Gateway → Work", ...sec("gateway", { media: img.interior1.id }) },
    ] as Prisma.SectionTemplateCreateManyInput[],
  });

  await db.globalSettings.create({
    data: {
      siteName: SITE,
      tagline: "Architectural visualization, product rendering, branding and websites. Made to sell.",
      email: "hello@example.com",
      socials: [] as Prisma.InputJsonValue,
      theme: { accent: "#3a4cc0", accentLo: "#17299c", font: "source-sans" } as Prisma.InputJsonValue,
      seoDefaults: { titleTemplate: `%s | ${SITE}`, description: "Architectural visualization, 3D product rendering, brand identities and websites.", ogImageId: img.heroPoster.id } as Prisma.InputJsonValue,
      features: { showLoader: true, customCursor: true, smoothScroll: true } as Prisma.InputJsonValue,
      footerCta: "Let's talk",
      copyright: `© ${SITE} Studio`,
      cookieText: "Necessary cookies keep the site working. With your consent, optional cookies measure visits so we can improve the site. You can change your choice at any time.",
    },
  });

  // A couple of demo submissions so the inbox isn't empty
  await db.contactSubmission.create({
    data: {
      name: "Jordan Example", email: "jordan@example.com", company: "Example Developments", disciplines: ["Architecture & Real Estate"],
      services: ["Exterior renderings", "Architectural animation"], description: "Twelve-unit residential scheme, pre-sales start in spring. Need 6 exterior views and a short film.",
      budget: "$10,000 to $25,000", timeline: "In 1 to 3 months", contactPref: "Email",
    },
  });
  console.log("✓ demo content created");
}

async function main() {
  await syncAccess();
  const hasContent = await db.globalSettings.count();
  if (process.argv.includes("--no-demo") || process.env.SEED_DEMO === "false") return;
  if (hasContent) {
    console.log("· content exists — demo seed skipped");
    return;
  }
  await demo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
