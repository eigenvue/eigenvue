#!/usr/bin/env node

/**
 * Eigenvue CLI — Command-line interface for the npm package.
 *
 * Usage:
 *   npx eigenvue list                          # List all algorithms
 *   npx eigenvue list --category classical      # Filter by category
 *   npx eigenvue show binary-search             # Open visualization
 *   npx eigenvue steps binary-search            # Print steps as JSON
 *   npx eigenvue --version                      # Print version
 */

import { list } from "./catalog";
import { steps } from "./runner";
import { show } from "./server";
import { version } from "./index";

function printUsage(): void {
  console.log(`
eigenvue v${version} — The visual learning platform for algorithms

Usage:
  eigenvue list [--category <category>]    List available algorithms
  eigenvue show <algorithm-id> [--port N]  Open interactive visualization
  eigenvue steps <algorithm-id>            Print step sequence as JSON
  eigenvue --version                       Print version
  eigenvue --help                          Show this help

Categories: classical, deep-learning, generative-ai, quantum

Examples:
  eigenvue list
  eigenvue list --category classical
  eigenvue show binary-search
  eigenvue show self-attention --port 8080
  eigenvue steps binary-search | jq '.steps | length'
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(version);
    return;
  }

  const command = args[0];

  switch (command) {
    case "list": {
      const categoryIdx = args.indexOf("--category");
      const category = categoryIdx !== -1 ? args[categoryIdx + 1] : undefined;
      const algorithms = list(category ? { category: category as "classical" | "deep-learning" | "generative-ai" | "quantum" } : undefined);

      // Pretty-print as a table
      console.log(`\n  ${"ID".padEnd(25)} ${"Name".padEnd(30)} ${"Category".padEnd(18)} Difficulty`);
      console.log(`  ${"─".repeat(25)} ${"─".repeat(30)} ${"─".repeat(18)} ${"─".repeat(12)}`);
      for (const algo of algorithms) {
        console.log(
          `  ${algo.id.padEnd(25)} ${algo.name.padEnd(30)} ${algo.category.padEnd(18)} ${algo.difficulty}`
        );
      }
      console.log(`\n  ${algorithms.length} algorithm(s) found.\n`);
      break;
    }

    case "show": {
      const algoId = args[1];
      if (!algoId) {
        console.error("Error: algorithm ID required. Usage: eigenvue show <algorithm-id>");
        process.exit(1);
      }
      const portIdx = args.indexOf("--port");
      const port = portIdx !== -1 ? parseInt(args[portIdx + 1]!, 10) : 0;
      show(algoId, { port });
      break;
    }

    case "steps": {
      const algoId = args[1];
      if (!algoId) {
        console.error("Error: algorithm ID required. Usage: eigenvue steps <algorithm-id>");
        process.exit(1);
      }
      const result = steps(algoId);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Run "eigenvue --help" for usage.`);
      process.exit(1);
  }
}

main();
