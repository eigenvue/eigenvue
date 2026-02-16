/**
 * Local visualization server — serves an interactive viewer in the browser.
 *
 * Uses Node's built-in http module (zero dependencies) to:
 * 1. Serve a bundled minimal web visualizer (HTML/JS/CSS from data/web/).
 * 2. Expose a JSON API endpoint returning step data.
 * 3. Open the default browser.
 *
 * MIRRORS: python/src/eigenvue/server.py
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { steps } from "./runner";
import { getAlgorithmMeta } from "./catalog";

/** Options for the show() function. */
export interface ShowOptions {
  /** TCP port for the local server. Default: 0 (auto-select). */
  port?: number;
  /** Whether to open the default browser. Default: true. */
  openBrowser?: boolean;
  /** Custom input parameters. If omitted, uses defaults. */
  inputs?: Record<string, unknown>;
}

/** MIME type mapping for serving static files. */
const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/**
 * Launch an interactive visualization in the browser.
 *
 * Starts a lightweight local HTTP server and opens the visualization
 * in the default browser. The server shuts down when the process exits
 * or when Ctrl+C is pressed.
 *
 * @param algorithmId - The algorithm identifier (e.g., "binary-search").
 * @param options - Configuration options.
 *
 * @example
 * ```typescript
 * import { show } from "eigenvue";
 *
 * show("binary-search");
 * show("self-attention", { inputs: { tokens: ["I", "love", "AI"] } });
 * ```
 */
export function show(algorithmId: string, options?: ShowOptions): void {
  const { port = 0, openBrowser = true, inputs } = options ?? {};

  // Pre-generate steps once at startup
  const stepSequence = steps(algorithmId, inputs);
  const meta = getAlgorithmMeta(algorithmId);

  const dataDir = path.resolve(__dirname, "..", "data");
  const webDir = path.join(dataDir, "web");

  const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
      // Serve the main visualization page
      const indexPath = path.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(fs.readFileSync(indexPath, "utf-8"));
      } else {
        res.writeHead(404);
        res.end("Visualization files not found.");
      }
    } else if (req.url === "/api/steps") {
      // Return step data as JSON
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        algorithmId,
        meta,
        steps: stepSequence.steps,
      }));
    } else if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", algorithmId }));
    } else if (req.url?.startsWith("/static/")) {
      // Serve static assets from data/web/
      const filePath = path.join(webDir, req.url.replace("/static/", ""));
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        res.writeHead(200, {
          "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
        });
        res.end(fs.readFileSync(filePath));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const addr = server.address();
    const actualPort = typeof addr === "object" && addr ? addr.port : port;
    const url = `http://127.0.0.1:${actualPort}`;

    console.log(`Eigenvue: serving "${algorithmId}" at ${url}`);
    console.log("Press Ctrl+C to stop.");

    if (openBrowser) {
      // Dynamic import to handle cross-platform browser opening
      import("node:child_process").then(({ exec }) => {
        const command = process.platform === "win32"
          ? `start ${url}`
          : process.platform === "darwin"
            ? `open ${url}`
            : `xdg-open ${url}`;
        exec(command);
      });
    }
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nEigenvue: server stopped.");
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    server.close();
    process.exit(0);
  });
}
