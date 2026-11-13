import { expect, test } from "@playwright/test";
import { quietSite } from "../e2e/helpers";

/**
 * Pixel regression baselines for this site (not for the reference site — see docs/TESTING.md).
 *
 * Pages render with reduced motion so every reveal is in its final state and pinned scenes fall
 * back to normal flow. Image and video pixels are hidden (their boxes keep their size and get a
 * flat grey) because media is replaceable in the CMS; type laid over media stays visible, so the
 * test still covers layout, type and colour.
 *
 * Create or refresh baselines with: npm run test:visual -- --update-snapshots
 */

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-375", width: 375, height: 812 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "work", path: "/work" },
  { name: "case-study", path: "/case-studies/maison-verlaine" },
  { name: "service", path: "/expertise/architecture-real-estate" },
  { name: "studio", path: "/studio" },
  { name: "newsroom", path: "/newsroom" },
  { name: "contact", path: "/contact" },
];

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });

    for (const p of PAGES) {
      test(`${p.name} @ ${vp.name}`, async ({ page }) => {
        await quietSite(page);
        await page.goto(p.path);
        await page.waitForLoadState("load");
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content: [
            // The custom cursor follows the pointer, so it is not part of the layout.
            ".cursor{display:none!important}",
            "*{caret-color:transparent!important}",
            "img,video{visibility:hidden!important}",
            ".media,.frame,picture{background:#5a5a5a!important}",
          ].join(""),
        });
        await expect(page).toHaveScreenshot(`${p.name}-${vp.name}.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
          timeout: 20_000,
        });
      });
    }
  });
}
