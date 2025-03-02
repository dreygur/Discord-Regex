/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enables the standalone output for Docker optimization
  // Add rewrites or redirects if needed
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig