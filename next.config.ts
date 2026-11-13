import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy. Scripts and styles allow 'unsafe-inline' because Next.js inlines its
 * bootstrap data and GSAP writes inline styles; everything else is locked to this origin plus
 * the two optional third parties: Cloudinary (media) and Google Analytics (after consent only).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hostinger (and Docker images) run the standalone server; set NEXT_OUTPUT=standalone to build it locally.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Prisma's query compiler loads this WebAssembly file from disk at runtime. File tracing can't
  // see that read, so without this the standalone server fails on its first database query.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/query_compiler_bg.wasm", "./node_modules/.prisma/client/schema.prisma"],
  },
  // Inline the (small) stylesheets into the HTML so they don't block first paint as separate requests.
  experimental: { inlineCss: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Later rules override earlier ones for the same header key.
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      // Hashed build assets and self-hosted fonts never change under the same URL.
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
