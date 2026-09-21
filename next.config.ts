import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Konva ships a Node entry that tries to require the native `canvas` package.
 * The editor only ever renders Konva in the browser, so we tell webpack to
 * treat `canvas` as an external and never try to bundle it.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), { canvas: "canvas" }];
    return config;
  },
};

export default nextConfig;
