import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enables the standalone output for Docker optimization
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_REGION: process.env.NEXT_REGION,
    NEXT_ENDPOINT: process.env.NEXT_ENDPOINT,
    NEXT_ACCESS_KEY_ID: process.env.NEXT_ACCESS_KEY_ID,
    NEXT_SECRET_ACCESS_KEY: process.env.NEXT_SECRET_ACCESS_KEY,
  },
  // Add rewrites or redirects if needed
  async rewrites() {
    return [];
  },
};

export default nextConfig;
