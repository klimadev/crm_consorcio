import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;