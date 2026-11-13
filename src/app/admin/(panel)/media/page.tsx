import { requirePageUser, can } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { listFolders } from "@/server/admin/library";
import { MediaLibrary } from "./MediaLibrary";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const user = await requirePageUser("media.read");
  const folders = await listFolders();
  return (
    <>
      <PageHeader title="Media library" description={`Images and videos used across the site. Files are stored with the ${process.env.MEDIA_DRIVER === "cloudinary" || process.env.CLOUDINARY_URL ? "Cloudinary" : "local disk"} driver.`} />
      <MediaLibrary folders={folders.map((f) => ({ id: f.id, name: f.name, count: f._count.media }))} perms={{ write: can(user, "media.write"), del: can(user, "media.delete") }} />
    </>
  );
}
