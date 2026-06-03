import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep `prisma` external on the server runtime so the generated client
  // is loaded at runtime rather than bundled.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
