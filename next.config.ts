import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  typescript: {
    // Type checking is done separately via `tsc --noEmit`
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
