import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Only run unit tests here; Playwright e2e lives under /e2e.
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
