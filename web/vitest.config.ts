import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Order matters: more-specific "@/shared" must precede catch-all "@".
      { find: "@/shared", replacement: resolve(__dirname, "../shared") },
      { find: "@", replacement: resolve(__dirname, "./src") },
    ],
  },
  server: {
    fs: {
      // Allow Vite to serve files from the parent directory (algorithms/, shared/).
      allow: [resolve(__dirname, "..")],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "../algorithms/**/*.{test,spec}.{ts,tsx}",
      "../tests/web/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "../tests/web/e2e/**"],
  },
});
