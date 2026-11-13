import { CmsPage, cmsPageMetadata } from "../_lib/cms";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("case-studies");

export default function Page() {
  return <CmsPage slug="case-studies" />;
}
