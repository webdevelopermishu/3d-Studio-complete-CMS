import { z } from "zod";
import { f, objectSchema, defaultsOf, type FieldDef, type InferFields } from "./fields";

/**
 * Section registry — the single source of truth for every content block the page builder
 * can place. Shared by the public renderer (validation + typing) and the admin editor (UI).
 * React components live in src/components/sections and are mapped by `type`.
 */

export type SectionCategory = "Hero" | "Story" | "Portfolio" | "Media" | "Call to action" | "Lists" | "Forms" | "Text";

type Def<F extends Record<string, FieldDef<unknown>>> = {
  type: string;
  label: string;
  category: SectionCategory;
  description: string;
  fields: F;
  schema: z.ZodType<InferFields<F>>;
  defaults: () => InferFields<F>;
};

function define<F extends Record<string, FieldDef<unknown>>>(d: {
  type: string;
  label: string;
  category: SectionCategory;
  description: string;
  fields: F;
}): Def<F> {
  return { ...d, schema: objectSchema(d.fields), defaults: () => defaultsOf(d.fields) };
}

const ground = f.select(
  "Background",
  [
    { value: "dark", label: "Dark (ink)" },
    { value: "light", label: "Light (paper)" },
  ] as const,
  "dark",
);

export const sections = {
  heroFilm: define({
    type: "heroFilm",
    label: "Hero — film",
    category: "Hero",
    description: "Home hero: a framed looping video that grows to full screen on scroll, with a stacked display title.",
    fields: {
      title: f.text("Title", "Ideas that leave a mark.", { help: "Each word stacks on its own line on desktop." }),
      subtitle: f.text("Subtitle", "Architecture · Product · Brand · Web"),
      video: f.media("Video (loop, muted)", "video"),
      image: f.media("Poster / fallback image", "image"),
    },
  }),
  pageHero: define({
    type: "pageHero",
    label: "Hero — cinema",
    category: "Hero",
    description: "Inner-page hero: framed media that expands to full-bleed while the title rises.",
    fields: {
      eyebrow: f.text("Eyebrow", ""),
      title: f.text("Title", "Page title"),
      media: f.media("Image or video", "any"),
      poster: f.media("Poster (for video)", "image"),
    },
  }),
  pageIntro: define({
    type: "pageIntro",
    label: "Page intro",
    category: "Text",
    description: "Large H1 with optional eyebrow and lead paragraph.",
    fields: {
      eyebrow: f.text("Eyebrow", ""),
      title: f.text("Title", "Page title"),
      lead: f.text("Lead", "", { multiline: true }),
      ground,
    },
  }),
  statement: define({
    type: "statement",
    label: "Statement",
    category: "Story",
    description: "Display-size manifesto revealed word by word, with a short body under a rule.",
    fields: {
      title: f.text("Statement", "Catching the eye is the start. Making the choice obvious is the point.", { multiline: true }),
      body: f.text("Body", "", { multiline: true }),
    },
  }),
  studioIntro: define({
    type: "studioIntro",
    label: "Two statements",
    category: "Story",
    description: "Two large statements; the second aligns right on desktop.",
    fields: { statements: f.strings("Statements", ["", ""], { max: 3 }) },
  }),
  disciplineScene: define({
    type: "disciplineScene",
    label: "Disciplines — pinned scene",
    category: "Portfolio",
    description: "Pinned full-screen panels cross-fading through services, with a progress track.",
    fields: {
      title: f.text("Heading", "Four disciplines. One standard."),
      services: f.refs("Services (empty = all published)", "service", { max: 6 }),
      linkLabel: f.text("Link label", "Explore"),
    },
  }),
  disciplinesStrip: define({
    type: "disciplinesStrip",
    label: "Disciplines — strip",
    category: "Portfolio",
    description: "Horizontal panels that widen on hover with vertical labels.",
    fields: {
      title: f.text("Title", "Four disciplines.\nOne standard.", { multiline: true }),
      services: f.refs("Services (empty = all published)", "service", { max: 6 }),
    },
  }),
  disciplineRows: define({
    type: "disciplineRows",
    label: "Disciplines — rows",
    category: "Portfolio",
    description: "Expertise index: one row per service with image, title, summary and link.",
    fields: {
      services: f.refs("Services (empty = all published)", "service", { max: 12 }),
      linkLabel: f.text("Link label", "Explore"),
    },
  }),
  figures: define({
    type: "figures",
    label: "Figures",
    category: "Story",
    description: "Headline plus up to four counting statistics.",
    fields: {
      title: f.text("Title", "The work speaks. So do the numbers.", { multiline: true }),
      items: f.list(
        "Figures",
        {
          value: f.text("Number", "100"),
          prefix: f.text("Prefix", ""),
          suffix: f.text("Suffix", "+"),
          label: f.text("Label", "Projects completed"),
          note: f.text("Note", ""),
        },
        [],
        { itemLabel: "Figure", max: 4 },
      ),
    },
  }),
  caseReel: define({
    type: "caseReel",
    label: "Case reel",
    category: "Portfolio",
    description: "Pinned horizontal reel of case studies with an intro word panel.",
    fields: {
      title: f.text("Title", "The work.\nFrom every angle.", { multiline: true }),
      link: f.link("Link", { label: "View all case studies", href: "/case-studies" }),
      projects: f.refs("Case studies (empty = featured)", "project", { max: 8 }),
      closingTitle: f.text("Closing title", "More work.\nMore perspective.", { multiline: true }),
    },
  }),
  clientWall: define({
    type: "clientWall",
    label: "Client wall",
    category: "Lists",
    description: "Marquee rows of client logos.",
    fields: {
      eyebrow: f.text("Eyebrow", "Clients"),
      title: f.text("Title", "Trusted by"),
      body: f.text("Body", "", { multiline: true }),
      rows: f.number("Rows", 3, { min: 1, max: 4 }),
      logos: f.list("Logos", { name: f.text("Name", ""), logo: f.media("Logo", "image") }, [], { itemLabel: "Logo", max: 60 }),
    },
  }),
  featurePanel: define({
    type: "featurePanel",
    label: "Feature panel",
    category: "Call to action",
    description: "Tall media panel with parallax, scrim, title and circle button (e.g. a publication).",
    fields: {
      eyebrow: f.text("Eyebrow", ""),
      title: f.text("Title", "Visual signature"),
      body: f.text("Body", "", { multiline: true }),
      media: f.media("Image or video", "any"),
      link: f.link("Button", { label: "Open", href: "/" }),
    },
  }),
  gateway: define({
    type: "gateway",
    label: "Gateway",
    category: "Call to action",
    description: "16:9 media card linking to another section of the site.",
    fields: {
      title: f.text("Title", "See the work"),
      body: f.text("Body", "Not your project (yet). But it might give you a few ideas.", { multiline: true }),
      media: f.media("Image or video", "any"),
      link: f.link("Button", { label: "View the work", href: "/work" }),
    },
  }),
  newsStrip: define({
    type: "newsStrip",
    label: "Newsroom strip",
    category: "Lists",
    description: "Latest articles as expanding panels.",
    fields: {
      title: f.text("Title", "Newsroom"),
      link: f.link("Link", { label: "Read all", href: "/newsroom" }),
      articles: f.refs("Articles (empty = latest)", "article", { max: 6 }),
      count: f.number("Count when automatic", 4, { min: 1, max: 6 }),
    },
  }),
  briefCta: define({
    type: "briefCta",
    label: "Brief call to action",
    category: "Call to action",
    description: "Oversized 'Got a project?' call to action with circle button and email.",
    fields: {
      eyebrow: f.text("Eyebrow", ""),
      title: f.text("Title", "Got a project? Brief us."),
      body: f.text("Body", "Your goal, a few references, plans if you have them. Send us what you have; we define the scope and prepare a quote.", { multiline: true }),
      link: f.link("Button", { label: "Start a project", href: "/contact#brief" }),
      showEmail: f.boolean("Show studio email", true),
    },
  }),
  chapter: define({
    type: "chapter",
    label: "Chapter",
    category: "Story",
    description: "Heading in the left column, large lead and body on the right, optional wide media.",
    fields: {
      heading: f.text("Heading", "Why it matters"),
      lead: f.text("Lead", "", { multiline: true }),
      body: f.richtext("Body"),
      media: f.media("Wide image or video", "any"),
      ground,
    },
  }),
  servicesList: define({
    type: "servicesList",
    label: "Services list",
    category: "Lists",
    description: "Two-column list of offerings. Empty list uses the current service's offerings.",
    fields: {
      heading: f.text("Heading", "Services"),
      items: f.strings("Items (empty = service offerings)"),
      ground,
    },
  }),
  editorial: define({
    type: "editorial",
    label: "Editorial",
    category: "Story",
    description: "Large editorial statement with a side note and an image pair.",
    fields: {
      text: f.text("Statement", "", { multiline: true }),
      note: f.text("Note", "", { multiline: true }),
      imageA: f.media("Image A", "image"),
      imageB: f.media("Image B", "image"),
      ground: f.select("Background", [{ value: "dark", label: "Dark (ink)" }, { value: "light", label: "Light (paper)" }] as const, "light"),
    },
  }),
  keepExploring: define({
    type: "keepExploring",
    label: "Keep exploring",
    category: "Lists",
    description: "Hover-preview list of related services or projects.",
    fields: {
      title: f.text("Title", "Keep exploring"),
      mode: f.select(
        "Source",
        [
          { value: "services", label: "Other services" },
          { value: "projects", label: "Selected projects" },
        ] as const,
        "services",
      ),
      projects: f.refs("Projects (when Source = projects)", "project", { max: 6 }),
      allLink: f.link("Final link", { label: "All expertise", href: "/expertise" }),
    },
  }),
  caseInsights: define({
    type: "caseInsights",
    label: "Case studies & insights",
    category: "Lists",
    description: "Hover-preview list mixing case studies and articles.",
    fields: {
      title: f.text("Title", "Case studies and insights"),
      projects: f.refs("Case studies", "project", { max: 6 }),
      articles: f.refs("Articles", "article", { max: 6 }),
      allLink: f.link("Final link", { label: "All projects", href: "/work" }),
    },
  }),
  caseChapter: define({
    type: "caseChapter",
    label: "Case chapter",
    category: "Story",
    description: "Case-study chapter: heading (cols 1–4) and prose (cols 7–12).",
    fields: {
      heading: f.text("Heading", "", { multiline: true }),
      body: f.richtext("Body"),
      ground: f.select("Background", [{ value: "light", label: "Light (paper)" }, { value: "dark", label: "Dark (ink)" }] as const, "light"),
    },
  }),
  caseMedia: define({
    type: "caseMedia",
    label: "Media",
    category: "Media",
    description: "Single image or video: full-bleed, wide, contained or portrait.",
    fields: {
      media: f.media("Image or video", "any"),
      layout: f.select(
        "Layout",
        [
          { value: "bleed", label: "Full bleed (parallax)" },
          { value: "wide", label: "Wide (container)" },
          { value: "contained", label: "Contained on panel" },
          { value: "portrait", label: "Centered portrait" },
        ] as const,
        "bleed",
      ),
      caption: f.text("Caption", ""),
      ground: f.select("Background", [{ value: "light", label: "Light (paper)" }, { value: "dark", label: "Dark (ink)" }] as const, "light"),
    },
  }),
  imageRow: define({
    type: "imageRow",
    label: "Image row",
    category: "Media",
    description: "Two or three images in a row, sized by their natural ratios.",
    fields: {
      images: f.list("Images", { media: f.media("Image", "image"), caption: f.text("Caption", "") }, [], { itemLabel: "Image", max: 3 }),
      ground: f.select("Background", [{ value: "light", label: "Light (paper)" }, { value: "dark", label: "Dark (ink)" }] as const, "light"),
    },
  }),
  vision: define({
    type: "vision",
    label: "Vision film",
    category: "Media",
    description: "Pinned full-screen film with three statements appearing in sequence.",
    fields: {
      media: f.media("Video or image", "any"),
      poster: f.media("Poster", "image"),
      statements: f.strings("Statements", ["", "", ""], { max: 3 }),
    },
  }),
  method: define({
    type: "method",
    label: "Process",
    category: "Story",
    description: "Pinned numbered process steps with a progress rule.",
    fields: {
      eyebrow: f.text("Eyebrow", "Approach"),
      title: f.text("Title", "Process"),
      intro: f.text("Intro", "Start with the right problem.", { multiline: true }),
      steps: f.list("Steps", { title: f.text("Title", ""), body: f.text("Body", "", { multiline: true }) }, [], { itemLabel: "Step", max: 6 }),
    },
  }),
  workWall: define({
    type: "workWall",
    label: "Work wall",
    category: "Portfolio",
    description: "Filterable masonry wall of every published project tile, with lightbox.",
    fields: {
      eyebrow: f.text("Eyebrow", "Image archive"),
      title: f.text("Title", "Work"),
      showFilters: f.boolean("Show filters", true),
    },
  }),
  caseIndex: define({
    type: "caseIndex",
    label: "Case study index",
    category: "Portfolio",
    description: "Full-screen wheel of case study titles with live previews and discipline filters.",
    fields: { title: f.text("Title (screen readers)", "Case studies") },
  }),
  articleList: define({
    type: "articleList",
    label: "Article list",
    category: "Lists",
    description: "Newsroom index on paper with date, title and thumbnail rows.",
    fields: {
      title: f.text("Title", "A closer look at 3D and design."),
      lead: f.text("Lead", "Practical guides and studio perspectives on rendering, visual identity and web design.", { multiline: true }),
    },
  }),
  contactIntro: define({
    type: "contactIntro",
    label: "Contact intro",
    category: "Forms",
    description: "Contact page header with the two paths: brief or email.",
    fields: {
      eyebrow: f.text("Eyebrow", "Contact"),
      title: f.text("Title", "Your project. Let's talk outcomes."),
      lead: f.text("Lead", "", { multiline: true }),
      briefLabel: f.text("Brief label", "Start a project"),
      briefBody: f.text("Brief body", "Five short steps. We reply with scope and next steps.", { multiline: true }),
      emailLabel: f.text("Email label", "Prefer email?"),
      emailNote: f.text("Email note", "We reply within two business days."),
    },
  }),
  contactBrief: define({
    type: "contactBrief",
    label: "Project brief form",
    category: "Forms",
    description: "Five-step brief wizard. Disciplines and services come from published services.",
    fields: {
      budgets: f.strings("Budget options", ["Under $2,500", "$2,500 to $5,000", "$5,000 to $10,000", "$10,000 to $25,000", "Over $25,000", "Not defined yet"]),
      timelines: f.strings("Timeline options", ["As soon as possible", "Within a month", "In 1 to 3 months", "In more than 3 months", "Flexible"]),
      stages: f.strings("Project stage options", ["Just an idea for now", "Plans or brief in progress", "Already underway", "Existing project to improve"]),
      successTitle: f.text("Success title", "Brief received."),
      successBody: f.text("Success message", "Thank you. We review every brief personally and will reply within two business days.", { multiline: true }),
    },
  }),
  richText: define({
    type: "richText",
    label: "Rich text",
    category: "Text",
    description: "Heading and formatted body text.",
    fields: { heading: f.text("Heading", ""), body: f.richtext("Body"), ground },
  }),
  legal: define({
    type: "legal",
    label: "Legal document",
    category: "Text",
    description: "Legal page with sticky table of contents.",
    fields: {
      title: f.text("Title", "Legal notice"),
      intro: f.text("Intro", "", { multiline: true }),
      updated: f.text("Last updated", ""),
      sections: f.list("Sections", { heading: f.text("Heading", ""), body: f.richtext("Body") }, [], { itemLabel: "Section", max: 40 }),
    },
  }),
} as const;

export type SectionType = keyof typeof sections;
export type SectionData<T extends SectionType> = InferFields<(typeof sections)[T]["fields"]>;
export const SECTION_TYPES = Object.keys(sections) as SectionType[];

export function isSectionType(t: string): t is SectionType {
  return Object.prototype.hasOwnProperty.call(sections, t);
}

export function getSectionDef(t: string) {
  return isSectionType(t) ? sections[t] : null;
}

/** Validate & normalise raw section data. Returns null for unknown types or invalid shapes. */
export function parseSectionData(type: string, data: unknown) {
  const def = getSectionDef(type);
  if (!def) return { ok: false as const, error: `Unknown section type "${type}"` };
  const r = (def.schema as z.ZodType).safeParse(data ?? {});
  if (!r.success) return { ok: false as const, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true as const, data: r.data as Record<string, unknown> };
}

/** Shape stored in publishedSections snapshots and passed to the renderer. */
export type SectionRecord = { id: string; type: string; enabled: boolean; data: unknown; label?: string | null };
