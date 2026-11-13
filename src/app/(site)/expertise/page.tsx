import { CmsPage, cmsPageMetadata } from "../_lib/cms";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("expertise");

export default function Page() {
  return <CmsPage slug="expertise" />;
}
