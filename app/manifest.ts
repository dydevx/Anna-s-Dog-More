import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anna's Dog & More",
    short_name: "Anna's Dog",
    description: "Premium products for dogs and their people in Zürich.",
    start_url: "/de",
    display: "standalone",
    background_color: "#F8F3EC",
    theme_color: "#3F2927",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
