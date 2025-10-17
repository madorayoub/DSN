import type { MetadataRoute } from "next";
import { SITE_URL } from "../site.config";

const routes: string[] = [
  "/",
  "/services-and-solutions",
  "/industries",
  "/case-studies",
  "/about",
  "/book-a-call",
  "/careers",
  "/contact",
  "/faq",
  "/privacy-policy",
  "/terms",
  "/blog",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((r) => ({
    url: `${SITE_URL}${r}`,
    lastModified: now,
    changeFrequency: r === "/" ? "weekly" : "monthly",
    priority: r === "/" ? 1 : 0.7,
  }));
}
