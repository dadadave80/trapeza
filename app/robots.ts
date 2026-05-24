import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://trapeza-gamma.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/onboard", "/demo"],
        disallow: ["/api/", "/auth/", "/mockups/", "/trace/", "/portfolio"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
