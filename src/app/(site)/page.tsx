import { CmsPage, cmsPageMetadata } from "./_lib/cms";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("");

export default function HomePage() {
  return <CmsPage slug="" />;
}
