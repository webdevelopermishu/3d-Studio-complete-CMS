import { CmsPage, cmsPageMetadata } from "../_lib/cms";

export const revalidate = 3600;
export const dynamicParams = true;
/** Rendered on first request, then cached (ISR) and purged on CMS changes. */
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string[] }> };

const toSlug = (parts: string[]) => parts.map((p) => decodeURIComponent(p)).join("/").toLowerCase();

export async function generateMetadata({ params }: Props) {
  return cmsPageMetadata(toSlug((await params).slug));
}

export default async function Page({ params }: Props) {
  return <CmsPage slug={toSlug((await params).slug)} />;
}
