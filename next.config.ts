import type { NextConfig } from "next";

const config: NextConfig = {
  // PGlite ships a wasm build that must not be bundled into the server output.
  serverExternalPackages: ["postgres"],
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
