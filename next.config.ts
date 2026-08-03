import type { NextConfig } from "next";

const config: NextConfig = {
  // Keeps the `postgres` driver as a real dependency rather than bundled,
  // and produces a self-contained server/ folder for the Docker image.
  serverExternalPackages: ["postgres"],
  output: "standalone",
  async headers() {
    return [
      {
        // Exercise clips never change once built.
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default config;
