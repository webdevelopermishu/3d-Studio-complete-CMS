import { describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword, passwordProblems } from "@/lib/auth/password";
import { signPreviewToken, verifyPreviewToken } from "@/lib/preview";
import { PERMISSIONS, ROLE_DEFAULTS } from "@/lib/auth/permissions";
import { themeCss } from "@/lib/theme";
import { safeHref } from "@/lib/utils";
import { isSameOrigin, publicUrl } from "@/lib/public-url";

describe("password hashing", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("correct horse 42");
    const b = await hashPassword("correct horse 42");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse 42", a)).toBe(true);
    expect(await verifyPassword("wrong horse 42", a)).toBe(false);
  });
  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "plain")).toBe(false);
  });
  it("enforces a minimal password policy", () => {
    expect(passwordProblems("short1")).toMatch(/10 characters/);
    expect(passwordProblems("longpasswordnonumber")).toMatch(/number/);
    expect(passwordProblems("long enough 123")).toBeNull();
  });
});

describe("preview tokens", () => {
  it("round-trips signed claims", () => {
    const t = signPreviewToken("page", "abc");
    expect(verifyPreviewToken(t)).toMatchObject({ type: "page", id: "abc" });
  });
  it("rejects tampered payloads and signatures", () => {
    const t = signPreviewToken("page", "abc");
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ type: "page", id: "other", exp: 9999999999 })).toString("base64url");
    expect(verifyPreviewToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyPreviewToken(`${payload}.AAAA`)).toBeNull();
    expect(verifyPreviewToken("garbage")).toBeNull();
    expect(verifyPreviewToken(null)).toBeNull();
  });
  it("expires", () => {
    vi.useFakeTimers();
    const t = signPreviewToken("article", "x", 60);
    vi.advanceTimersByTime(61_000);
    expect(verifyPreviewToken(t)).toBeNull();
    vi.useRealTimers();
  });
});

describe("RBAC defaults", () => {
  it("admins get everything; viewers only read", () => {
    expect(ROLE_DEFAULTS.ADMIN.permissions.length).toBe(Object.keys(PERMISSIONS).length);
    expect(ROLE_DEFAULTS.VIEWER.permissions.every((p) => p.endsWith(".read") || p === "dashboard.view")).toBe(true);
    expect(ROLE_DEFAULTS.EDITOR.permissions).not.toContain("user.manage");
    expect(ROLE_DEFAULTS.AUTHOR.permissions).not.toContain("article.publish");
  });
});

describe("CMS-provided values are sanitised", () => {
  it("theme CSS only accepts hex colours", () => {
    const { css } = themeCss({ accent: "red;}body{display:none", accentHi: "#3a4cc0", font: "inter" });
    expect(css).not.toContain("display:none");
    expect(css).toContain("--accent-hi:#3a4cc0");
    expect(css).toContain('"Inter"');
  });
  it("unknown fonts fall back to the default", () => {
    expect(themeCss({ font: "comic" }).css).toContain('"Source Sans 3"');
  });
  it("blocks dangerous link schemes", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,x")).toBe("#");
    expect(safeHref("/work")).toBe("/work");
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
  });
});

describe("behind a reverse proxy", () => {
  const req = (url: string, headers: Record<string, string>) => new Request(url, { headers });

  it("builds redirects from the forwarded host, not the internal address", () => {
    const r = req("http://0.0.0.0:3000/old", { host: "127.0.0.1:3000", "x-forwarded-host": "studio.example.com", "x-forwarded-proto": "https" });
    expect(publicUrl(r, "/new").toString()).toBe("https://studio.example.com/new");
  });

  it("falls back to the Host header", () => {
    expect(publicUrl(req("http://0.0.0.0:3100/x", { host: "localhost:3100" }), "/y").toString()).toBe("http://localhost:3100/y");
  });

  it("accepts uploads from the public origin and rejects other origins", () => {
    const headers = { host: "127.0.0.1:3000", "x-forwarded-host": "studio.example.com", "x-forwarded-proto": "https" };
    expect(isSameOrigin(req("http://0.0.0.0:3000/api/admin/media", { ...headers, origin: "https://studio.example.com" }))).toBe(true);
    expect(isSameOrigin(req("http://0.0.0.0:3000/api/admin/media", { ...headers, origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(req("http://0.0.0.0:3000/api/admin/media", { ...headers, origin: "not a url" }))).toBe(false);
  });
});
