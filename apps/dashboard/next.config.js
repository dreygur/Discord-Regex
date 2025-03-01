/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enables the standalone output for Docker optimization
  experimental: {
    // Uncomment if you're using app directory
    // appDir: true,
  },
  // Configure environment variables to be replaced at build time
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
  // Add rewrites or redirects if needed
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig