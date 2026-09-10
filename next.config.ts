import type { NextConfig } from "next";

// Set by the GitHub Pages workflow; empty locally and on any root-served host.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // The app is entirely client-side, so it exports to plain files that any
  // static host — GitHub Pages included — can serve.
  output: "export",
  basePath,
  // Pages has no rewrite layer, so each route needs to be a real directory
  // with its own index.html.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
