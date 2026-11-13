import type { ComponentType } from "react";
import { collectMediaIds, type FieldDef } from "@/sections/fields";
import { getSectionDef, parseSectionData, type SectionRecord, type SectionType } from "@/sections/registry";
import { getMediaMap } from "@/server/queries";
import { logger } from "@/lib/logger";
import type { SectionContext, SectionProps } from "./types";
import { HeroFilm, PageHero, PageIntro } from "./hero";
import { Statement, StudioIntro, Figures, Chapter, ServicesList, Editorial, Vision, Method, CaseChapter, RichTextSection } from "./story";
import { DisciplineSceneSection, DisciplinesStrip, DisciplineRows, CaseReel, WorkWallSection, CaseIndexSection } from "./portfolio";
import { KeepExploring, CaseInsights, NewsStrip, ArticleList, ClientWall, FeaturePanel, Gateway, BriefCta } from "./lists";
import { ContactIntro, ContactBrief, CaseMedia, ImageRow, Legal } from "./forms";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySection = ComponentType<SectionProps<any>>;

const COMPONENTS: Record<SectionType, AnySection> = {
  heroFilm: HeroFilm,
  pageHero: PageHero,
  pageIntro: PageIntro,
  statement: Statement,
  studioIntro: StudioIntro,
  disciplineScene: DisciplineSceneSection,
  disciplinesStrip: DisciplinesStrip,
  disciplineRows: DisciplineRows,
  figures: Figures,
  caseReel: CaseReel,
  clientWall: ClientWall,
  featurePanel: FeaturePanel,
  gateway: Gateway,
  newsStrip: NewsStrip,
  briefCta: BriefCta,
  chapter: Chapter,
  servicesList: ServicesList,
  editorial: Editorial,
  keepExploring: KeepExploring,
  caseInsights: CaseInsights,
  caseChapter: CaseChapter,
  caseMedia: CaseMedia,
  imageRow: ImageRow,
  vision: Vision,
  method: Method,
  workWall: WorkWallSection,
  caseIndex: CaseIndexSection,
  articleList: ArticleList,
  contactIntro: ContactIntro,
  contactBrief: ContactBrief,
  richText: RichTextSection,
  legal: Legal,
};

function PreviewNotice({ type, error }: { type: string; error: string }) {
  return (
    <div className="section-error" role="note">
      <strong>Section “{type}” was not rendered.</strong> {error}
      <span> (Only visible in preview.)</span>
    </div>
  );
}

/**
 * Renders a list of CMS sections. Unknown types and data that fail schema validation are skipped
 * (and logged); in draft preview an inline notice explains what was skipped.
 */
export async function SectionRenderer({ sections, ctx }: { sections: SectionRecord[]; ctx: SectionContext }) {
  const parsed = sections
    .filter((s) => s.enabled !== false)
    .map((s) => {
      const res = parseSectionData(s.type, s.data);
      if (!res.ok) logger.warn("section.invalid", { id: s.id, type: s.type, error: res.error, owner: ctx.owner });
      return { s, res };
    });

  const ids = new Set<string>();
  for (const { s, res } of parsed) {
    const def = getSectionDef(s.type);
    if (def && res.ok) collectMediaIds(def.fields as Record<string, FieldDef<unknown>>, res.data, ids);
  }
  const media = await getMediaMap(ids);

  return (
    <>
      {parsed.map(({ s, res }, index) => {
        if (!res.ok) return ctx.preview ? <PreviewNotice key={s.id} type={s.type} error={res.error} /> : null;
        const Component = COMPONENTS[s.type as SectionType];
        if (!Component) return ctx.preview ? <PreviewNotice key={s.id} type={s.type} error="No renderer registered." /> : null;
        return <Component key={s.id} id={s.id} index={index} data={res.data} media={media} ctx={ctx} />;
      })}
    </>
  );
}
