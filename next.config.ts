import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // saveFilm receives the frame's bytes as a Server Action argument, and
      // actions are capped at 1MB by default. Sources are 1280x533, but a PNG
      // at that size clears 1MB easily, so the default would reject ordinary
      // uploads. Sharp re-encodes to WebP server-side; this only bounds what
      // the browser may post.
      bodySizeLimit: "8mb",
    },
  },
  // Pin Turbopack to this repo. Without it, a stray package-lock.json in a
  // parent directory makes Turbopack infer a workspace root outside the project.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
