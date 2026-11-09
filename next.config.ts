import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // GET /api/openapi reads docs/openapi.yaml. Include that file in the server
  // trace so the deployed route can still read it.
  outputFileTracingIncludes: {
    "/api/openapi": ["./docs/openapi.yaml"],
  },
  // AGENTS.md is the team's single rules file (AGENTS.md §14); stop `next dev`
  // from injecting its own managed block into it.
  agentRules: false,
  turbopack: {
    // swagger-ui-react's React entry loads ApiDOM source, and Turbopack drops
    // OpenApi3_1Element.refract. Alias the prebuilt bundle, which already
    // contains that code, so the docs page can mount it directly.
    resolveAlias: {
      "swagger-ui-bundle":
        "./node_modules/swagger-ui-react/swagger-ui-bundle.js",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
