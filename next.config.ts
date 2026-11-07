import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Renderização dinâmica clássica (sessão via cookies em toda página da área logada).
  // cacheComponents fica desligado de propósito: simplifica auth + RLS.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
