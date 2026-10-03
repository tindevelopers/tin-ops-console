import type { NextConfig } from "next";

// Same SVGR wiring as konnect-caas-base/apps/ops: ui-shell's icons are SVG imports.
const nextConfig: NextConfig = {
  transpilePackages: ["@tindevelopers/ui-shell"],
  reactStrictMode: true,
  webpack(config) {
    const fileLoaderRule = config.module.rules.find(
      (rule: { test?: RegExp }) => rule.test instanceof RegExp && rule.test.test(".svg"),
    );
    if (fileLoaderRule) fileLoaderRule.exclude = /\.svg$/i;
    config.module.rules.push({
      test: /\.svg$/i,
      resourceQuery: { not: /__next_metadata__/ },
      issuer: fileLoaderRule?.issuer,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
