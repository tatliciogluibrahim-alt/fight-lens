import type { MetadataRoute } from "next";
import { getAllFightParams, getAllEventIds } from "@/lib/events/registry";

const BASE_URL = "https://fight-lens.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const eventIds = getAllEventIds();
  const fightParams = getAllFightParams();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/record`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = eventIds.map((eventId) => ({
    url: `${BASE_URL}/events/${eventId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const fightRoutes: MetadataRoute.Sitemap = fightParams.map(({ eventId, fightId }) => ({
    url: `${BASE_URL}/events/${eventId}/${fightId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...eventRoutes, ...fightRoutes];
}
