import { describe, expect, it } from "vitest";
import { execSync } from "child_process";
import path from "path";
import { readFileSync } from "fs";

const CLI_PATH = path.resolve(__dirname, "../../node/dist/cli.js");
const PKG = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../node/package.json"), "utf-8"),
) as { version: string };

/**
 * Execute the CLI and return stdout.
 * Throws if the command exits with a non-zero code (unless expectError is true).
 */
function runCli(args: string, expectError = false): string {
  try {
    const output = execSync(`node "${CLI_PATH}" ${args}`, {
      encoding: "utf-8",
      timeout: 30_000,
      cwd: path.resolve(__dirname, "../../node"),
    });
    return output;
  } catch (error: unknown) {
    if (expectError && error && typeof error === "object" && "status" in error) {
      const execError = error as { stdout: string; stderr: string; status: number };
      return execError.stderr || execError.stdout || "";
    }
    throw error;
  }
}

describe("CLI", () => {
  it("prints version with --version", () => {
    const output = runCli("--version");
    expect(output.trim()).toBe(PKG.version);
  });

  it("prints version with -v", () => {
    const output = runCli("-v");
    expect(output.trim()).toBe(PKG.version);
  });

  it("prints usage with --help", () => {
    const output = runCli("--help");
    expect(output).toContain("eigenvue");
    expect(output).toContain("Usage:");
    expect(output).toContain("list");
    expect(output).toContain("show");
    expect(output).toContain("steps");
  });

  it("prints usage with no arguments", () => {
    const output = runCli("");
    expect(output).toContain("Usage:");
  });

  it("lists all algorithms", () => {
    const output = runCli("list");
    expect(output).toContain("binary-search");
    expect(output).toContain("17 algorithm(s) found.");
  });

  it("filters by category", () => {
    const output = runCli("list --category classical");
    expect(output).toContain("binary-search");
    expect(output).toContain("7 algorithm(s) found.");
    // Should not contain deep-learning algorithms
    expect(output).not.toContain("backpropagation");
  });

  it("outputs valid JSON for steps command", () => {
    const output = runCli("steps binary-search");
    const parsed = JSON.parse(output) as { steps: unknown[]; algorithmId: string };
    expect(parsed).toHaveProperty("algorithmId", "binary-search");
    expect(parsed).toHaveProperty("steps");
    expect(Array.isArray(parsed.steps)).toBe(true);
    expect(parsed.steps.length).toBeGreaterThan(0);
  });

  it("exits with code 1 for unknown command", () => {
    const output = runCli("unknown-command", true);
    expect(output).toContain("Unknown command");
  });

  it("exits with code 1 when steps is called without algorithm ID", () => {
    const output = runCli("steps", true);
    expect(output).toContain("algorithm ID required");
  });
});
