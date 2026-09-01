/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional deployment under a sub-path (e.g. /Marketing instead of /).
  // Set BASE_PATH=/Marketing in the environment when deploying under a
  // sub-directory. Leave it empty (default) for root deployments.
  basePath: process.env.BASE_PATH || '',

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
