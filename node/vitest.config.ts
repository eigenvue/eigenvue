import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@/shared", replacement: resolve(__dirname, "../shared") },
      { find: "@/engine", replacement: resolve(__dirname, "../web/src/engine") },
      { find: "@/algorithms", replacement: resolve(__dirname, "../algorithms") },
    ],
  },
  test: {
    include: [
      "../tests/node/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**"],
    // Increase timeout for generator tests (some algorithms are compute-heavy)
    testTimeout: 30_000,
  },
});
