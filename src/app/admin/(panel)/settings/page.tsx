import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePageUser("settings.write");
  const s = await db.globalSettings.findUnique({ where: { id: "global" } });
  const theme = (s?.theme ?? {}) as Record<string, string>;
  const features = { showLoader: true, customCursor: true, smoothScroll: true, ...((s?.features ?? {}) as Record<string, boolean>) };
  return (
    <>
      <PageHeader title="Settings" description="Branding, contact details and site behaviour. Changes apply to the whole site." />
      <SettingsForm
        initial={{
          siteName: s?.siteName ?? "", tagline: s?.tagline ?? "", email: s?.email ?? "", phone: s?.phone ?? "", address: s?.address ?? "",
          logoId: s?.logoId ?? null, logoMarkId: s?.logoMarkId ?? null, faviconId: s?.faviconId ?? null,
          theme: { accent: theme.accent ?? "", accentHi: theme.accentHi ?? "", accentLo: theme.accentLo ?? "", background: theme.background ?? "", text: theme.text ?? "", font: theme.font ?? "source-sans" },
          features: { showLoader: !!features.showLoader, customCursor: !!features.customCursor, smoothScroll: !!features.smoothScroll },
          footerCta: s?.footerCta ?? "Let's talk", copyright: s?.copyright ?? "", cookieText: s?.cookieText ?? "", analyticsId: s?.analyticsId ?? "",
        }}
      />
    </>
  );
}
