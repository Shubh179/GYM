/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow production verification without overwriting a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
    ],
  },
  // The dataset and the pre-resolved video/guide JSON are read from disk at
  // runtime (via process.cwd()). Next.js does not reliably trace process.cwd()
  // reads into the serverless bundle, so force-include data/** for the routes
  // that need it — otherwise those functions 500 on Vercel with ENOENT.
  experimental: {
    outputFileTracingIncludes: {
      "/exercise/[slug]": ["./data/**"],
      "/api/exercises": ["./data/**"],
      "/api/exercise/[slug]": ["./data/**"],
    },
  },
};

export default nextConfig;
