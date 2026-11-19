import type { MetadataRoute } from "next";

const SITE = "https://www.constructionconcierge.ai";

// Search engines may read the public marketing pages. The app itself needs a login, so it is excluded.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/privacy", "/terms"], disallow: ["/api/", "/dashboard", "/jobs", "/m", "/kiosk", "/field", "/team", "/finance", "/scale", "/login", "/accept-invite", "/onboarding", "/admin"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
