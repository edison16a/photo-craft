import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration.
 *
 * Tests cover the pure modules under `src/lib`, `src/model`, `src/data` and
 * `src/store`. They run in jsdom so browser globals like `Blob` and
 * `indexedDB` (via fake-indexeddb) are available.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
