import { defineConfig } from "tsup";
import path from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  // Inject __dirname / __filename shims for ESM output.
  shims: true,
  clean: true,
  splitting: false,
  // Bundle everything into the output — no external imports needed at runtime.
  // This is critical: the generators, runner, and types are all bundled in.
  noExternal: [/.*/],
  // Resolve the path aliases that the generators use.
  esbuildOptions(options) {
    options.alias = {
      "@/shared": path.resolve(__dirname, "../shared"),
      "@/engine": path.resolve(__dirname, "../web/src/engine"),
      "@/algorithms": path.resolve(__dirname, "../algorithms"),
    };
  },
  // Mark Node built-ins as external (http, fs, path, etc.)
  platform: "node",
  target: "node18",
});
