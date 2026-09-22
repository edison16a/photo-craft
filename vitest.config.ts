import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration.
 *
 * Tests cover the pure modules under `src/lib`, `src/model`, `src/data` and
 * `src/store`, plus a few components rendered with react-dom. They run in
 * jsdom so browser globals like `Blob` and `indexedDB` (via fake-indexeddb)
 * are available. The tsconfig leaves JSX for Next to compile, so the
 * automatic runtime is picked here for the components a test renders.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
