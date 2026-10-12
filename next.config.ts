import type { NextConfig } from "next";
const config: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  // O export workerd nao e seguido pelo tracing feito no Node.js.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pg-cloudflare/dist/**/*",
      "./node_modules/pg-cloudflare/esm/**/*",
    ],
  },
};
export default config;
