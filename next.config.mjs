/** @type {import('next').NextConfig} */
const nextConfig = {
  // Upload size is configured in the route handler, but we bump the
  // server body parser limit here as a safety net.
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Avoid trailing slash redirects (cleaner URLs)
  trailingSlash: false,
  // Generate a stable build id per build
  generateBuildId: async () => `build-${Date.now()}`,
};

export default nextConfig;
