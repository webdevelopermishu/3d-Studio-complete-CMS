/** Brand fonts available in Settings → Branding. All self-hosted from /public/fonts. */
export const FONT_OPTIONS = {
  "source-sans": { label: "Source Sans 3", family: '"Source Sans 3"', file: "source-sans-3" },
  inter: { label: "Inter", family: '"Inter"', file: "inter" },
  manrope: { label: "Manrope", family: '"Manrope"', file: "manrope" },
  "dm-sans": { label: "DM Sans", family: '"DM Sans"', file: "dm-sans" },
  "space-grotesk": { label: "Space Grotesk", family: '"Space Grotesk"', file: "space-grotesk" },
} as const;
export type FontKey = keyof typeof FONT_OPTIONS;

const HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;
const safeColor = (v: unknown) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : null);

/** CSS custom-property overrides from Settings.theme (values are validated to plain hex colours). */
export function themeCss(theme: { accent?: string; accentHi?: string; accentLo?: string; background?: string; text?: string; font?: string }) {
  const vars: string[] = [];
  const accent = safeColor(theme.accent);
  if (accent) vars.push(`--accent:${accent}`);
  const hi = safeColor(theme.accentHi);
  if (hi) vars.push(`--accent-hi:${hi}`);
  const lo = safeColor(theme.accentLo);
  if (lo) vars.push(`--accent-lo:${lo}`);
  const bg = safeColor(theme.background);
  if (bg) vars.push(`--ink:${bg}`);
  const fg = safeColor(theme.text);
  if (fg) vars.push(`--paper:${fg}`);
  const font = FONT_OPTIONS[(theme.font as FontKey) ?? "source-sans"] ?? FONT_OPTIONS["source-sans"];
  vars.push(`--font-brand:${font.family}`);
  const faces = [`${font.file}-latin`, `${font.file}-latin-ext`]
    .map(
      (f, i) =>
        `@font-face{font-family:${font.family};font-style:normal;font-display:swap;font-weight:200 900;src:url(/fonts/${f}-wght-normal.woff2) format("woff2");${
          i === 0
            ? "unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
            : "unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
        }}`,
    )
    .join("");
  return { css: `${faces}:root{${vars.join(";")}}`, preload: `/fonts/${font.file}-latin-wght-normal.woff2` };
}
