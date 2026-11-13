/**
 * Generates original, abstract "render-style" placeholder imagery for the demo seed.
 * Pure SVG → JPEG via sharp; loop videos via ffmpeg (Ken Burns over a still) when available.
 * Replace everything from Admin → Media with real work.
 */
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const run = promisify(execFile);

// Deterministic PRNG so seeds are reproducible
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Palette = { sky: [string, string]; ground: string; a: string; b: string; light: string; accent: string };
const PALETTES: Palette[] = [
  { sky: ["#1d2733", "#c9b79c"], ground: "#2b2722", a: "#d8d2c6", b: "#8f8577", light: "#ffd9a0", accent: "#e8a25c" },
  { sky: ["#0d1520", "#3d5a73"], ground: "#141a1f", a: "#c7ccd1", b: "#5b6570", light: "#ffe7b8", accent: "#7fb3d5" },
  { sky: ["#e9e4dc", "#b7c2c8"], ground: "#8d8a83", a: "#f5f2ec", b: "#bfb8ad", light: "#fff6e3", accent: "#c97b4a" },
  { sky: ["#2a1e1a", "#d08b5b"], ground: "#3a2c24", a: "#e9d6c0", b: "#a17a5d", light: "#ffcf8a", accent: "#f2a65a" },
  { sky: ["#10161a", "#23343b"], ground: "#0b0f12", a: "#9fb3b8", b: "#4c5d63", light: "#cfe8ee", accent: "#4fb0a5" },
  { sky: ["#dfe6e9", "#f6efe6"], ground: "#c9c2b6", a: "#ffffff", b: "#d8d1c4", light: "#ffffff", accent: "#3a4cc0" },
];

const grain = (id: string, opacity = 0.08) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 ${opacity}"/></feComponentTransfer>
  </filter>`;

function architecture(w: number, h: number, p: Palette, r: () => number) {
  const horizon = h * (0.55 + r() * 0.12);
  const vols: string[] = [];
  let x = w * (0.08 + r() * 0.1);
  const count = 2 + Math.floor(r() * 3);
  for (let i = 0; i < count; i++) {
    const bw = w * (0.16 + r() * 0.22);
    const bh = h * (0.12 + r() * 0.26);
    const y = horizon - bh;
    const depth = bw * (0.18 + r() * 0.15);
    vols.push(`
      <polygon points="${x},${y} ${x + bw},${y} ${x + bw + depth},${y - depth * 0.35} ${x + depth},${y - depth * 0.35}" fill="${p.a}" opacity="0.92"/>
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${p.a}"/>
      <polygon points="${x + bw},${y} ${x + bw + depth},${y - depth * 0.35} ${x + bw + depth},${y + bh - depth * 0.35} ${x + bw},${y + bh}" fill="${p.b}"/>
      ${Array.from({ length: 2 + Math.floor(r() * 4) })
        .map((_, j, arr) => {
          const gw = bw / arr.length;
          return `<rect x="${x + j * gw + gw * 0.12}" y="${y + bh * 0.28}" width="${gw * 0.76}" height="${bh * 0.5}" fill="url(#glow)" opacity="${0.55 + r() * 0.45}"/>`;
        })
        .join("")}
      <rect x="${x - bw * 0.05}" y="${y - 6}" width="${bw * 1.1 + depth}" height="8" fill="${p.b}" opacity="0.9"/>`);
    x += bw + depth + w * (0.02 + r() * 0.08);
    if (x > w * 0.9) break;
  }
  const trees = Array.from({ length: 8 + Math.floor(r() * 10) })
    .map(() => {
      const tx = r() * w, ts = h * (0.05 + r() * 0.12);
      return `<ellipse cx="${tx}" cy="${horizon - ts * 0.4}" rx="${ts * 0.45}" ry="${ts}" fill="${p.ground}" opacity="${0.55 + r() * 0.4}"/>`;
    })
    .join("");
  return `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient>
      <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.ground}"/><stop offset="1" stop-color="#000"/></linearGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset="1" stop-color="${p.accent}"/></linearGradient>
      <radialGradient id="sun" cx="${0.2 + r() * 0.6}" cy="${0.35 + r() * 0.15}" r="0.6"><stop offset="0" stop-color="${p.light}" stop-opacity="0.55"/><stop offset="1" stop-color="${p.light}" stop-opacity="0"/></radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="${w / 260}"/></filter>
      ${grain("g")}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect width="${w}" height="${h}" fill="url(#sun)"/>
    <g filter="url(#soft)" opacity="0.8">${trees}</g>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#gr)"/>
    <rect y="${horizon + h * 0.06}" width="${w}" height="${h * 0.05}" fill="${p.sky[1]}" opacity="0.18"/>
    ${vols.join("")}
    <g opacity="0.25" filter="url(#soft)">${vols.join("")}</g>`;
}

function interior(w: number, h: number, p: Palette, r: () => number) {
  const floorY = h * (0.62 + r() * 0.08);
  const winX = w * (0.12 + r() * 0.4), winW = w * (0.22 + r() * 0.18);
  const sofaX = w * (0.2 + r() * 0.35), sofaW = w * (0.32 + r() * 0.1), sofaH = h * 0.14;
  return `
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.b}"/><stop offset="1" stop-color="${p.a}"/></linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.ground}"/><stop offset="1" stop-color="#120f0c"/></linearGradient>
      <linearGradient id="shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.light}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.light}" stop-opacity="0"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="${w / 120}"/></filter>
      <filter id="soft2"><feGaussianBlur stdDeviation="${w / 400}"/></filter>
      ${grain("g")}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#wall)"/>
    <rect x="${winX}" y="${h * 0.1}" width="${winW}" height="${floorY - h * 0.16}" fill="${p.light}" opacity="0.92"/>
    <rect x="${winX + winW / 2 - 3}" y="${h * 0.1}" width="6" height="${floorY - h * 0.16}" fill="${p.b}"/>
    <polygon points="${winX},${floorY} ${winX + winW},${floorY} ${winX + winW * 2.2},${h} ${winX + winW * 0.6},${h}" fill="url(#shaft)" filter="url(#soft)"/>
    <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="url(#floor)"/>
    <polygon points="${winX},${floorY} ${winX + winW},${floorY} ${winX + winW * 2.2},${h} ${winX + winW * 0.6},${h}" fill="${p.light}" opacity="0.18" filter="url(#soft)"/>
    <ellipse cx="${sofaX + sofaW / 2}" cy="${floorY + sofaH * 0.55}" rx="${sofaW * 0.6}" ry="${sofaH * 0.25}" fill="#000" opacity="0.35" filter="url(#soft)"/>
    <rect x="${sofaX}" y="${floorY - sofaH * 0.55}" width="${sofaW}" height="${sofaH}" rx="${sofaH * 0.25}" fill="${p.a}" filter="url(#soft2)"/>
    <rect x="${sofaX}" y="${floorY - sofaH * 1.05}" width="${sofaW}" height="${sofaH * 0.6}" rx="${sofaH * 0.25}" fill="${p.b}" filter="url(#soft2)"/>
    <rect x="${sofaX + sofaW * 1.1}" y="${floorY - h * 0.32}" width="4" height="${h * 0.32}" fill="${p.ground}"/>
    <ellipse cx="${sofaX + sofaW * 1.1 + 2}" cy="${floorY - h * 0.32}" rx="${w * 0.03}" ry="${h * 0.025}" fill="${p.light}" filter="url(#soft2)"/>
    <circle cx="${sofaX + sofaW * 1.1 + 2}" cy="${floorY - h * 0.3}" r="${w * 0.06}" fill="${p.light}" opacity="0.22" filter="url(#soft)"/>`;
}

function product(w: number, h: number, p: Palette, r: () => number) {
  const cx = w * (0.4 + r() * 0.2), base = h * 0.78;
  const bw = w * (0.1 + r() * 0.07), bh = h * (0.36 + r() * 0.18);
  const shape = Math.floor(r() * 3);
  const body =
    shape === 0
      ? `<rect x="${cx - bw / 2}" y="${base - bh}" width="${bw}" height="${bh}" rx="${bw * 0.18}" fill="url(#body)"/>
         <rect x="${cx - bw * 0.18}" y="${base - bh - bh * 0.14}" width="${bw * 0.36}" height="${bh * 0.16}" rx="${bw * 0.06}" fill="${p.b}"/>`
      : shape === 1
        ? `<path d="M ${cx - bw * 0.25} ${base - bh} C ${cx - bw * 1.1} ${base - bh * 0.6}, ${cx - bw * 0.9} ${base}, ${cx} ${base} C ${cx + bw * 0.9} ${base}, ${cx + bw * 1.1} ${base - bh * 0.6}, ${cx + bw * 0.25} ${base - bh} Z" fill="url(#body)"/>`
        : `<rect x="${cx - bw * 1.2}" y="${base - bh * 0.5}" width="${bw * 2.4}" height="${bh * 0.12}" rx="6" fill="url(#body)"/>
           <rect x="${cx - bw * 1.1}" y="${base - bh * 0.4}" width="${bw * 0.12}" height="${bh * 0.4}" fill="${p.b}"/>
           <rect x="${cx + bw * 0.98}" y="${base - bh * 0.4}" width="${bw * 0.12}" height="${bh * 0.4}" fill="${p.b}"/>
           <rect x="${cx - bw * 1.2}" y="${base - bh}" width="${bw * 2.4}" height="${bh * 0.5}" rx="${bw * 0.3}" fill="url(#body)" opacity="0.95"/>`;
  return `
    <defs>
      <radialGradient id="bg" cx="0.5" cy="0.35" r="0.9"><stop offset="0" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[0]}"/></radialGradient>
      <linearGradient id="body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.b}"/><stop offset="0.35" stop-color="${p.a}"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="${w / 90}"/></filter>
      ${grain("g")}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <ellipse cx="${cx}" cy="${base}" rx="${bw * 1.5}" ry="${h * 0.025}" fill="#000" opacity="0.45" filter="url(#soft)"/>
    <rect y="${base}" width="${w}" height="${h - base}" fill="${p.ground}" opacity="0.18"/>
    ${body}
    <rect x="${cx - bw * 0.32}" y="${base - bh * 0.92}" width="${bw * 0.08}" height="${bh * 0.7}" fill="#fff" opacity="0.35" filter="url(#soft)"/>`;
}

function brand(w: number, h: number, p: Palette, r: () => number, word: string) {
  const bx = w * 0.14, by = h * 0.16, bw = w * 0.72, bh = h * 0.5;
  return `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="${w / 200}"/></filter>
      ${grain("g")}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect x="${bx + bw * 0.48}" y="${by + bh}" width="${w * 0.012}" height="${h - by - bh}" fill="${p.ground}"/>
    <rect x="${bx - 8}" y="${by - 8}" width="${bw + 16}" height="${bh + 16}" fill="${p.ground}"/>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${p.accent}"/>
    <circle cx="${bx + bw * (0.7 + r() * 0.15)}" cy="${by + bh * 0.45}" r="${bh * 0.32}" fill="${p.a}" opacity="0.9"/>
    <text x="${bx + bw * 0.06}" y="${by + bh * 0.62}" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${bh * 0.32}" fill="#fff" letter-spacing="-${bh * 0.012}">${word}</text>
    <text x="${bx + bw * 0.065}" y="${by + bh * 0.82}" font-family="Helvetica, Arial, sans-serif" font-size="${bh * 0.07}" fill="#fff" opacity="0.85" letter-spacing="${bh * 0.012}">NEW COLLECTION · AVAILABLE NOW</text>
    <rect y="${h * 0.86}" width="${w}" height="${h * 0.14}" fill="${p.ground}" opacity="0.85" filter="url(#soft)"/>`;
}

function web(w: number, h: number, p: Palette, r: () => number, word: string) {
  const lw = w * 0.64, lh = lw * 0.62, lx = (w - lw) / 2, ly = h * 0.16;
  const rows = Array.from({ length: 3 })
    .map((_, i) => `<rect x="${lx + lw * 0.06 + i * lw * 0.3}" y="${ly + lh * 0.58}" width="${lw * 0.26}" height="${lh * 0.26}" fill="${i === 1 ? p.accent : p.b}" opacity="0.9"/>`)
    .join("");
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="${w / 120}"/></filter>
      ${grain("g")}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <ellipse cx="${w / 2}" cy="${ly + lh + h * 0.08}" rx="${lw * 0.6}" ry="${h * 0.03}" fill="#000" opacity="0.4" filter="url(#soft)"/>
    <rect x="${lx - lw * 0.02}" y="${ly - lw * 0.02}" width="${lw * 1.04}" height="${lh + lw * 0.04}" rx="${lw * 0.02}" fill="#111"/>
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="#0a0a0a"/>
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh * 0.5}" fill="${p.b}" opacity="${0.4 + r() * 0.3}"/>
    <text x="${lx + lw * 0.06}" y="${ly + lh * 0.34}" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${lh * 0.13}" fill="#fff">${word}</text>
    ${rows}
    <path d="M ${lx - lw * 0.12} ${ly + lh + lw * 0.02} L ${lx + lw * 1.12} ${ly + lh + lw * 0.02} L ${lx + lw * 1.08} ${ly + lh + lw * 0.06} L ${lx - lw * 0.08} ${ly + lh + lw * 0.06} Z" fill="#2a2a2a"/>`;
}

export type DemoKind = "architecture" | "interior" | "product" | "brand" | "web";

export async function renderDemoImage(kind: DemoKind, seed: number, w: number, h: number, word = "HALDEN"): Promise<Buffer> {
  const r = rng(seed * 7919 + w);
  const p = PALETTES[seed % PALETTES.length];
  const inner =
    kind === "architecture" ? architecture(w, h, p, r)
    : kind === "interior" ? interior(w, h, p, r)
    : kind === "product" ? product(w, h, p, r)
    : kind === "brand" ? brand(w, h, p, r, word)
    : web(w, h, p, r, word);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}<rect width="${w}" height="${h}" filter="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** Short silent H.264 loop (slow push-in) from a still. Returns null when ffmpeg is unavailable. */
export async function renderDemoVideo(still: Buffer, seconds = 6, size = "1280x800"): Promise<Buffer | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "demo-vid-"));
  try {
    const inFile = path.join(dir, "in.jpg");
    const outFile = path.join(dir, "out.mp4");
    await writeFile(inFile, still);
    const fps = 25;
    await run("ffmpeg", [
      "-y", "-v", "error", "-loop", "1", "-i", inFile,
      "-vf", `scale=2400:-2,zoompan=z='min(zoom+0.0009,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${seconds * fps}:s=${size}:fps=${fps},format=yuv420p`,
      "-t", String(seconds), "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-movflags", "+faststart", "-an", outFile,
    ]);
    return await readFile(outFile);
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
