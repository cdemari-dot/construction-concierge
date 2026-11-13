import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (Next 16's default) statically caches anything that
  // doesn't read a request-time API. This app is multi-tenant and almost
  // every page reads the signed-in user's company data, so we run the
  // previous, fully-dynamic-by-default model instead: predictable, and no
  // risk of one company's data getting cached into another's response.
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
