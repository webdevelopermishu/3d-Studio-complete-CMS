import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { quietSite } from "../e2e/helpers";
import { FIELDS, GEOMETRY, TOLERANCE, type Field } from "./geometry.map";

/**
 * Layout and typography comparison against the reference site.
 *
 * The reference numbers in tests/visual/reference/*.json come from running the same probe on
 * the live reference pages (see docs/TESTING.md). Pixel screenshots of the reference could not
 * be captured reliably, so this test compares computed geometry instead of pixels: type scale,
 * weights, tracking, column positions, widths and paddings.
 *
 * A human-readable diff is written to tests/visual/out/geometry-report.md on every run.
 */

type Vec = [number, number, number, number, number, number, number, number, number];
type Row = { page: string; key: string; field: Field; ref: number; local: number | null; ok: boolean; soft: boolean };

const OUT = path.join(__dirname, "out");

async function settle(page: Page) {
  // Walk the page so scroll-triggered reveals and counters reach their final state, then return to the top.
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.6);
    const max = () => document.documentElement.scrollHeight - innerHeight;
    for (let y = 0; y <= max(); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
}

async function probe(page: Page, sels: Record<string, string>): Promise<Record<string, Vec | null>> {
  return page.evaluate((sels) => {
    const out: Record<string, number[] | null> = {};
    for (const [k, sel] of Object.entries(sels)) {
      const el = document.querySelector(sel);
      if (!el) {
        out[k] = null;
        continue;
      }
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const fs = parseFloat(c.fontSize);
      out[k] = [
        +fs.toFixed(1),
        c.lineHeight === "normal" ? 0 : +(parseFloat(c.lineHeight) / fs).toFixed(2),
        +c.fontWeight,
        c.letterSpacing === "normal" ? 0 : +(parseFloat(c.letterSpacing) / fs).toFixed(3),
        Math.round(r.left),
        Math.round(r.width),
        Math.round(parseFloat(c.paddingTop)),
        Math.round(parseFloat(c.paddingLeft)),
        Math.round(r.height),
      ];
    }
    return out as Record<string, Vec | null>;
  }, sels);
}

function within(field: Exclude<Field, "h">, ref: number, local: number) {
  const t = TOLERANCE[field];
  return Math.abs(local - ref) <= Math.max(t.abs, t.rel * Math.abs(ref)) + 1e-9;
}


for (const [name, spec] of Object.entries(GEOMETRY)) {
  test(`geometry ${name}`, async ({ page }) => {
    const reference = JSON.parse(readFileSync(path.join(__dirname, "reference", `${name}.json`), "utf8")) as Record<string, Vec | unknown>;
    await page.setViewportSize(spec.viewport);
    await quietSite(page);
    await page.goto(spec.path);
    await page.waitForLoadState("load");
    await settle(page);

    const sels = Object.fromEntries(Object.entries(spec.keys).map(([k, p]) => [k, p.sel]));
    const local = await probe(page, sels);
    const failures: string[] = [];
    const rows: Row[] = [];

    for (const [key, p] of Object.entries(spec.keys)) {
      const ref = reference[key] as Vec | undefined;
      if (!Array.isArray(ref)) continue;
      const got = local[key];
      if (!got) {
        failures.push(`${key}: selector ${p.sel} not found`);
        rows.push({ page: name, key, field: "fs", ref: ref[0], local: null, ok: false, soft: false });
        continue;
      }
      FIELDS.forEach((field, i) => {
        const soft = field === "h" || !!p.skip?.includes(field);
        const ok = field === "h" ? true : within(field as Exclude<Field, "h">, ref[i], got[i]);
        rows.push({ page: name, key, field, ref: ref[i], local: got[i], ok, soft });
        if (!ok && !soft) failures.push(`${key}.${field}: reference ${ref[i]}, local ${got[i]} (${p.sel})`);
      });
    }

    writeReport(name, rows);
    expect(failures, `Geometry differences on ${name}`).toEqual([]);
  });
}

function writeReport(name: string, rows: Row[]) {
  // Playwright restarts the worker after a failing test, so each page writes its own file and
  // the combined report is rebuilt from all of them.
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, `geometry-${name}.json`), JSON.stringify(rows));
  const all = readdirSync(OUT)
    .filter((f) => /^geometry-.+@\d+\.json$/.test(f))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(OUT, f), "utf8")) as Row[]);
  const lines = ["# Geometry comparison", "", "Only rows that differ from the reference are listed. `soft` rows are reported, not asserted.", ""];
  for (const p of [...new Set(all.map((r) => r.page))]) {
    const pageRows = all.filter((x) => x.page === p);
    const fails = pageRows.filter((r) => !r.ok && !r.soft).length;
    lines.push(`## ${p} — ${fails ? `${fails} failing` : "all asserted fields within tolerance"}`, "");
    lines.push("| key | field | reference | local | result |", "| --- | --- | ---: | ---: | --- |");
    for (const r of pageRows) {
      if (r.ref === r.local) continue;
      const result = r.local === null ? "missing" : r.soft ? "soft" : r.ok ? "ok" : "FAIL";
      lines.push(`| ${r.key} | ${r.field} | ${r.ref} | ${r.local ?? "—"} | ${result} |`);
    }
    lines.push("");
  }
  writeFileSync(path.join(OUT, "geometry-report.md"), lines.join("\n"));
}
