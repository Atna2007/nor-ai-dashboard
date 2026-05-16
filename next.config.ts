import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  typescript: {
    // Type checking is done separately via `tsc --noEmit`
    // This prevents transient Prisma/test type issues from blocking deploys
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint is run separately; don't block deploys on lint warnings
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
