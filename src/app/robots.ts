/**
 * Robots.txt configuration
 */

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/onboarding/",
          "/(protected)/",
          "/sign-in/",
          "/sign-up/",
        ],
      },
    ],
    sitemap: "https://needatradesman.com/sitemap.xml",
  };
}
