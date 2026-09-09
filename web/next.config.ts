import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.BCS_EVENTS_REVIEW === "true" ? ".next-events" : ".next",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingExcludes: { "/*": ["./.local/**/*", "./src/generated/**/*", "../.local/**/*", "../data/**/*"] },
  output: "standalone",
  outputFileTracingRoot: repositoryRoot,
  turbopack: {
    root: repositoryRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
})(withNextIntl(nextConfig));
