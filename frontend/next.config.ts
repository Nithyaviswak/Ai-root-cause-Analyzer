import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor Turbopack root to the frontend directory, not the git/monorepo root
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
