import type { MetadataRoute } from "next";
import { withBase } from "@/lib/basePath";

// Generated rather than static, because every URL in it has to carry the
// GitHub Pages subfolder prefix.

// `output: export` needs metadata routes pinned to build time.
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budget",
    short_name: "Budget",
    description: "Personal income and expense tracker. Your data stays on this device.",
    start_url: withBase("/"),
    scope: withBase("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#131210",
    theme_color: "#131210",
    icons: [
      { src: withBase("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: withBase("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: withBase("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
