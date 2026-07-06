import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Replit dev proxy — allow cross-origin HMR from the preview iframe
  allowedDevOrigins: [
    "*.replit.dev",
    "*.sisko.replit.dev",
    "*.repl.co",
    process.env.REPLIT_DEV_DOMAIN ?? "",
  ].filter(Boolean),

  // Node.js packages that must not be bundled by webpack
  serverExternalPackages: [
    "yt-search",
    "youtube-transcript",
    "duck-duck-scrape",
    "cheerio",
  ],

  // Allow YouTube thumbnail images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },

  webpack(config, { isServer }) {
    if (isServer && process.env.DISABLE_HMR === "true") {
      config.watchOptions = { poll: false, ignored: "**/*" };
    }
    return config;
  },
};

export default nextConfig;
