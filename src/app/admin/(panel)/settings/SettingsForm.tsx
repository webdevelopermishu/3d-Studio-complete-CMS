"use client";
import { useState } from "react";
import { saveSettings } from "@/server/admin/site";
import { FONT_OPTIONS } from "@/lib/theme";
import { Button, Card, Field, Input, Select, Textarea, Toggle } from "@/components/admin/ui";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { useAction } from "@/components/admin/feedback";

type S = {
  siteName: string; tagline: string; email: string; phone: string; address: string; logoId: string | null; logoMarkId: string | null; faviconId: string | null;
  theme: { accent: string; accentHi: string; accentLo: string; background: string; text: string; font: string };
  features: { showLoader: boolean; customCursor: boolean; smoothScroll: boolean };
  footerCta: string; copyright: string; cookieText: string; analyticsId: string;
};

function Color({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder: string }) {
  const id = `c-${label.replace(/\W/g, "")}`;
  return (
    <Field label={label} error={error} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : placeholder} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-zinc-300" />
        <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </Field>
  );
}

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const save = useAction(saveSettings, { success: "Settings saved — the site has been refreshed" });
  const e = save.fieldErrors;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));
  const theme = (k: keyof S["theme"], v: string) => setS((x) => ({ ...x, theme: { ...x.theme, [k]: v } }));
  return (
    <form onSubmit={(ev) => { ev.preventDefault(); save.run(s); }} className="grid gap-6 lg:grid-cols-2">
      <Card title="Identity">
        <div className="flex flex-col gap-4">
          <Field label="Site name" htmlFor="s-name" error={e.siteName}><Input id="s-name" value={s.siteName} onChange={(ev) => set("siteName", ev.target.value)} /></Field>
          <Field label="Tagline" htmlFor="s-tag" help="Shown in the menu and used as the default description."><Textarea id="s-tag" rows={2} value={s.tagline} onChange={(ev) => set("tagline", ev.target.value)} /></Field>
          <Field label="Logo (header)" help="SVG or PNG on a transparent background. Empty = text wordmark."><MediaPicker value={s.logoId} onChange={(v) => set("logoId", v)} /></Field>
          <Field label="Logo mark (footer)" help="Square mark, ~80×80."><MediaPicker value={s.logoMarkId} onChange={(v) => set("logoMarkId", v)} compact /></Field>
          <Field label="Favicon" help="Square PNG or SVG, at least 48×48."><MediaPicker value={s.faviconId} onChange={(v) => set("faviconId", v)} compact /></Field>
        </div>
      </Card>
      <Card title="Brand style" description="Colours and typography across the public site.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Color label="Accent" value={s.theme.accent} onChange={(v) => theme("accent", v)} error={e["theme.accent"]} placeholder="#17299c" />
          <Color label="Accent (hover on dark)" value={s.theme.accentHi} onChange={(v) => theme("accentHi", v)} error={e["theme.accentHi"]} placeholder="#3a4cc0" />
          <Color label="Accent (pressed)" value={s.theme.accentLo} onChange={(v) => theme("accentLo", v)} error={e["theme.accentLo"]} placeholder="#101e76" />
          <Color label="Dark background" value={s.theme.background} onChange={(v) => theme("background", v)} error={e["theme.background"]} placeholder="#000000" />
          <Color label="Light background" value={s.theme.text} onChange={(v) => theme("text", v)} error={e["theme.text"]} placeholder="#ffffff" />
          <Field label="Typeface" htmlFor="s-font">
            <Select id="s-font" value={s.theme.font} onChange={(ev) => theme("font", ev.target.value)}>
              {Object.entries(FONT_OPTIONS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2 rounded-md p-5" style={{ background: s.theme.background || "#000", color: s.theme.text || "#fff", fontFamily: FONT_OPTIONS[s.theme.font as keyof typeof FONT_OPTIONS]?.family }}>
            <p className="text-3xl font-semibold tracking-tight">{s.siteName || "Preview"}</p>
            <p className="mt-1 text-sm opacity-70">The quick brown fox jumps over the lazy dog.</p>
            <span className="mt-3 inline-block rounded-full px-3 py-1 text-xs text-white" style={{ background: s.theme.accent || "#17299c" }}>Accent</span>
          </div>
        </div>
      </Card>
      <Card title="Contact">
        <div className="flex flex-col gap-4">
          <Field label="Studio email" htmlFor="s-email" error={e.email} help="Shown on the site; new briefs are sent here unless CONTACT_NOTIFY_EMAIL is set."><Input id="s-email" type="email" value={s.email} onChange={(ev) => set("email", ev.target.value)} /></Field>
          <Field label="Phone" htmlFor="s-phone"><Input id="s-phone" value={s.phone} onChange={(ev) => set("phone", ev.target.value)} /></Field>
          <Field label="Address" htmlFor="s-addr"><Textarea id="s-addr" rows={2} value={s.address} onChange={(ev) => set("address", ev.target.value)} /></Field>
        </div>
      </Card>
      <Card title="Behaviour & footer">
        <div className="flex flex-col gap-4">
          <Toggle checked={s.features.showLoader} onChange={(v) => set("features", { ...s.features, showLoader: v })} label="Intro loader" help="Percentage counter on the first visit of a session." />
          <Toggle checked={s.features.customCursor} onChange={(v) => set("features", { ...s.features, customCursor: v })} label="Custom cursor" help="Desktop with a mouse only." />
          <Toggle checked={s.features.smoothScroll} onChange={(v) => set("features", { ...s.features, smoothScroll: v })} label="Smooth scrolling" help="Off automatically for touch devices and reduced motion." />
          <Field label="Footer headline" htmlFor="s-cta" error={e.footerCta}><Input id="s-cta" value={s.footerCta} onChange={(ev) => set("footerCta", ev.target.value)} /></Field>
          <Field label="Copyright line" htmlFor="s-copy"><Input id="s-copy" value={s.copyright} onChange={(ev) => set("copyright", ev.target.value)} /></Field>
          <Field label="Cookie banner text" htmlFor="s-cookie"><Textarea id="s-cookie" rows={3} value={s.cookieText} onChange={(ev) => set("cookieText", ev.target.value)} /></Field>
          <Field label="Google Analytics 4 ID" htmlFor="s-ga" error={e.analyticsId} help="Loaded only after visitors accept analytics cookies."><Input id="s-ga" value={s.analyticsId} placeholder="G-XXXXXXX" onChange={(ev) => set("analyticsId", ev.target.value)} /></Field>
        </div>
      </Card>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-200 bg-[#f6f6f5]/90 py-3 backdrop-blur lg:col-span-2">
        <Button type="submit" variant="primary" loading={save.pending}>Save settings</Button>
      </div>
    </form>
  );
}
