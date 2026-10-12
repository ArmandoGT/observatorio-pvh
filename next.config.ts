import type { NextConfig } from "next";
const config: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
};
export default config;
