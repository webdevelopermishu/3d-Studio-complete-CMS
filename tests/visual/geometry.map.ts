/**
 * Maps each reference probe key (tests/visual/reference/<page>@<width>.json) to the selector
 * that plays the same role in this codebase.
 *
 * The reference values were read from the live reference site's DOM with the probe in
 * `probe.ts` (font size, line-height ratio, weight, tracking, x, width, padding-top,
 * padding-left, height). Because this site's copy and imagery are different, some values
 * depend on content (how many words a title has, how wide a logo is). Those fields are listed
 * in `skip` so the comparison only asserts the parts that come from the design system.
 *
 * Height (`h`) is never asserted. It is reported so line-wrapping differences stay visible.
 */
export type Field = "fs" | "lh" | "fw" | "ls" | "x" | "w" | "pt" | "pl" | "h";
export type Probe = { sel: string; skip?: Field[]; note?: string };
export type PageMap = { path: string; viewport: { width: number; height: number }; keys: Record<string, Probe> };

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Widths of shrink-to-fit or content-sized elements depend on the copy. */
const CONTENT_W: Field[] = ["w"];

export const GEOMETRY: Record<string, PageMap> = {
  "home@1440": {
    path: "/",
    viewport: DESKTOP,
    keys: {
      nav: { sel: ".nav" },
      logo: { sel: ".nav__logo", skip: ["w", "fs", "lh"], note: "logo is configurable" },
      heroTitle: { sel: ".hero__title" },
      heroSub: { sel: ".hero__subtitle" },
      statement: { sel: ".statement", skip: ["h"] },
      statementTitle: { sel: ".statement__title" },
      statementBody: { sel: ".statement__body" },
      xpTitle: { sel: ".xp__title", skip: CONTENT_W },
      xpPanelTitle: { sel: ".xp-panel__title", skip: CONTENT_W },
      xpPanelBody: { sel: ".xp-panel__body", skip: CONTENT_W },
      figures: { sel: ".figures" },
      figuresTitle: { sel: ".figures__title" },
      figuresValue: { sel: ".figures__value" },
      reelWord: { sel: ".reel-word__title", skip: CONTENT_W },
      reelCardTitle: { sel: ".reel-card__title", skip: ["x"], note: "x depends on horizontal track position" },
      reelCardSummary: { sel: ".reel-card__summary", skip: ["x"] },
      clients: { sel: ".clients" },
      clientsTitle: { sel: ".clients__title" },
      clientCard: { sel: ".client-wall__card", skip: ["x", "w"], note: "marquee position is time-based" },
      signatureTitle: { sel: ".signature__title" },
      gateway: { sel: ".gateway" },
      gatewayTitle: { sel: ".gateway__title" },
      gatewayBody: { sel: ".gateway__body" },
      newsHeading: { sel: ".news-scene__heading", skip: CONTENT_W },
      newsPanelTitle: { sel: ".news-panel__title" },
      contactScene: { sel: ".contact-scene" },
      contactTitle: { sel: ".contact-scene__title", skip: CONTENT_W, note: "reference sets each line in its own block, so width is the longest line" },
      contactBody: { sel: ".contact-scene__body" },
      circleBtnLabel: { sel: ".contact-scene .circle-btn__label", skip: ["x", "w"] },
      footerHeadline: { sel: ".footer__headline", skip: ["x", "w"], note: "centred, width follows the headline text" },
      footerEmail: { sel: ".footer__email", skip: ["x", "w"] },
      footerColLabel: { sel: ".footer__col-label" },
      footerLink: { sel: ".footer__links a", skip: CONTENT_W },
      footerBottom: { sel: ".footer__bottom" },
    },
  },
  "home@390": {
    path: "/",
    viewport: PHONE,
    keys: {
      heroTitle: { sel: ".hero__title", skip: CONTENT_W },
      statementTitle: { sel: ".statement__title" },
      statementBody: { sel: ".statement__body" },
      figuresTitle: { sel: ".figures__title" },
      figuresValue: { sel: ".figures__value", skip: CONTENT_W },
      xpTitle: { sel: ".xp__title", skip: CONTENT_W },
      clientsTitle: { sel: ".clients__title" },
      gatewayTitle: { sel: ".gateway__title", skip: CONTENT_W },
      contactTitle: { sel: ".contact-scene__title", skip: CONTENT_W },
      footerHeadline: { sel: ".footer__headline", skip: ["x", "w"] },
    },
  },
  "case-study@1440": {
    path: "/case-studies/maison-verlaine",
    viewport: DESKTOP,
    keys: {
      facts: { sel: ".case-facts" },
      factLabel: { sel: ".case-fact__label" },
      factValue: { sel: ".case-fact__value" },
      openStatement: { sel: ".case-open__statement" },
      chapterHeading: { sel: ".case-chapter__heading" },
      chapterBody: { sel: ".case-chapter__body" },
      prose: { sel: ".case-chapter__body .prose__p" },
      nextTitle: { sel: ".whats-next__title", skip: CONTENT_W },
      nextRow: { sel: ".next-row" },
      nextRowTitle: { sel: ".next-row__title", skip: CONTENT_W },
      nextRowMeta: { sel: ".next-row__meta", skip: ["x", "w"] },
    },
  },
  "service@1440": {
    path: "/expertise/architecture-real-estate",
    viewport: DESKTOP,
    keys: {
      chapterHeading: { sel: ".chapter__heading" },
      chapterLead: { sel: ".chapter__lead" },
      chapterBody: { sel: ".chapter__body" },
      chapterMedia: { sel: ".chapter__media" },
      capsItem: { sel: ".caps__item" },
      editorialText: { sel: ".editorial__text" },
      editorialNote: { sel: ".editorial__note" },
      gatewayPanel: { sel: ".gateway__panel" },
      briefTitle: { sel: ".contact-scene__title", skip: CONTENT_W },
      circleBtn: { sel: ".contact-scene .circle-btn", skip: ["pt", "pl"] },
    },
  },
  "contact@1440": {
    path: "/contact",
    viewport: DESKTOP,
    keys: {
      intro: { sel: ".contact-intro" },
      introTitle: { sel: ".contact-intro__title" },
      introLead: { sel: ".contact-intro__lead" },
      paths: { sel: ".contact-paths" },
      pathEmail: { sel: ".contact-path__email", skip: CONTENT_W },
      briefAside: { sel: ".brief__aside" },
      briefTitle: { sel: ".brief__title" },
      briefHint: { sel: ".brief__hint", skip: CONTENT_W },
      briefMain: { sel: ".brief__main" },
      choiceLarge: { sel: ".choice--large .choice__label", skip: CONTENT_W },
    },
  },
  "work@1440": {
    path: "/work",
    viewport: DESKTOP,
    keys: {
      rail: { sel: ".work__rail", skip: ["h"] },
      wall: { sel: ".work-wall", skip: ["h"] },
      tile: { sel: ".work-tile" },
      filterLabel: { sel: ".work-filter__label" },
      filterBtn: { sel: ".work-filter__btn", skip: CONTENT_W },
      h1: { sel: ".work__title" },
    },
  },
  "studio@1440": {
    path: "/studio",
    viewport: DESKTOP,
    keys: {
      intro: { sel: ".studio-intro" },
      introStatement: { sel: ".studio-intro__statement" },
      methodTitle: { sel: ".method__title" },
      methodIntro: { sel: ".method__intro", skip: CONTENT_W },
      methodStepTitle: { sel: ".method__step-title" },
      methodBody: { sel: ".method__body" },
      disciplines: { sel: ".disciplines" },
      disciplinesTitle: { sel: ".disciplines__title" },
      discipline: { sel: ".discipline" },
      disciplineEdge: { sel: ".discipline__edge" },
      visionStatement: { sel: ".vision__statement", skip: CONTENT_W, note: "shrink-wrapped below a 6.15em cap" },
    },
  },
  "newsroom@1440": {
    path: "/newsroom",
    viewport: DESKTOP,
    keys: {
      intro: { sel: ".newsroom__intro" },
      title: { sel: ".newsroom__title" },
      lead: { sel: ".newsroom__lead" },
      grid: { sel: ".newsroom__grid" },
      card: { sel: ".news-card" },
      cardMedia: { sel: ".news-card__media" },
      cardDate: { sel: ".news-card__date" },
      cardTitle: { sel: ".news-card__title" },
    },
  },
};

/** Per-field tolerance: |local - reference| must be within max(abs, rel * |reference|). */
export const TOLERANCE: Record<Exclude<Field, "h">, { abs: number; rel: number }> = {
  fs: { abs: 1, rel: 0.03 },
  lh: { abs: 0.05, rel: 0 },
  fw: { abs: 0, rel: 0 },
  ls: { abs: 0.008, rel: 0 },
  x: { abs: 12, rel: 0 },
  w: { abs: 16, rel: 0.04 },
  pt: { abs: 8, rel: 0.1 },
  pl: { abs: 8, rel: 0 },
};

export const FIELDS: Field[] = ["fs", "lh", "fw", "ls", "x", "w", "pt", "pl", "h"];
