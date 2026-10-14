import type { MetadataRoute } from "next";

import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * `/account` is per-customer and behind a sign-in, so there is nothing there
 * for a crawler to index. `/api` is JSON. `/search` is excluded because its
 * query strings generate unlimited URLs whose content already exists on the
 * catalogue and product pages — crawl budget spent there is crawl budget not
 * spent on posters. `/checkout` is the post-payment return and confirmation,
 * one URL per order.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api/", "/checkout", "/search"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
