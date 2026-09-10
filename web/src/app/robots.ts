import type { MetadataRoute } from "next";
import { centerContent } from "@/content/center";
import { publicIndexingEnabled } from "@/lib/public-indexing";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!publicIndexingEnabled()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/ko/admin", "/en/admin", "/api/"] },
    sitemap: `${centerContent.ko.visit.website.href}/sitemap.xml`,
  };
}
