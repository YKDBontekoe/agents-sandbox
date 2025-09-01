import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  experimental: {
    // Temporarily disable Turbopack to avoid HMR module pattern errors
    turbo: {
      rules: {},
    },
  },
};

export default nextConfig;
