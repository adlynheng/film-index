import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack to this repo. Without it, a stray package-lock.json in a
  // parent directory makes Turbopack infer a workspace root outside the project.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
