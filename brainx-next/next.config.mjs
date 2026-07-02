import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const apiServerUrl = process.env.API_SERVER_URL ?? "http://localhost:8088";
const intelligenceApiBaseUrl = process.env.INTELLIGENCE_API_BASE_URL ?? "http://localhost:8086";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectDir,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/ai/:path*",
        destination: `${intelligenceApiBaseUrl}/api/v1/ai/:path*`,
      },
      {
        source: "/api/v1/intelligence/:path*",
        destination: `${intelligenceApiBaseUrl}/api/v1/intelligence/:path*`,
      },
      {
        source: "/api/v1/notes/:noteId/summary",
        destination: `${intelligenceApiBaseUrl}/api/v1/notes/:noteId/summary`,
      },
      {
        source: "/api/v1/users/me/style-profile",
        destination: `${intelligenceApiBaseUrl}/api/v1/users/me/style-profile`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiServerUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
