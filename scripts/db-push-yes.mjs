#!/usr/bin/env node
/**
 * Non-interactive wrapper for drizzle-kit push
 *
 * PROBLEM: drizzle-kit push has TWO types of interactive prompts:
 * 1. Data loss confirmations → handled by --force
 * 2. Column rename/create decisions → NOT handled by --force
 *
 * SOLUTION: Pipe newlines to stdin to auto-select default options,
 * and use a timeout to prevent infinite hangs.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const TIMEOUT_MS = 120_000; // 2 minutes max
const PROMPT_INTERVAL_MS = 500; // Send enter every 500ms

console.log("🔄 Pushing schema changes (auto-confirm mode, 2min timeout)...\n");

const drizzleKit = spawn("npx", ["drizzle-kit", "push", "--force"], {
  cwd: projectRoot,
  stdio: ["pipe", "inherit", "inherit"], // pipe stdin, inherit stdout/stderr
  shell: true,
  env: {
    ...process.env,
    CI: "true",
    FORCE_COLOR: "1",
  },
});

// Periodically send newlines to auto-confirm any prompts
// This selects the default option (usually "create column")
const promptInterval = setInterval(() => {
  if (drizzleKit.stdin && !drizzleKit.stdin.destroyed) {
    drizzleKit.stdin.write("\n");
  }
}, PROMPT_INTERVAL_MS);

// Timeout handler to prevent infinite hangs
const timeout = setTimeout(() => {
  console.error("\n❌ drizzle-kit push timed out after 2 minutes");
  console.error("   This usually means the database is unreachable.");
  clearInterval(promptInterval);
  drizzleKit.kill("SIGTERM");
  setTimeout(() => {
    if (!drizzleKit.killed) {
      drizzleKit.kill("SIGKILL");
    }
    process.exit(124); // Standard timeout exit code
  }, 5000);
}, TIMEOUT_MS);

drizzleKit.on("close", code => {
  clearTimeout(timeout);
  clearInterval(promptInterval);

  if (code === 0) {
    console.log("\n✅ Schema pushed successfully");
    process.exit(0);
  } else if (code === 124) {
    // Already handled by timeout
    process.exit(124);
  } else {
    console.error(`\n❌ drizzle-kit push failed with exit code ${code}`);
    process.exit(code || 1);
  }
});

drizzleKit.on("error", error => {
  clearTimeout(timeout);
  clearInterval(promptInterval);
  console.error("❌ Failed to spawn drizzle-kit:", error.message);
  process.exit(1);
});

// Handle process termination gracefully
process.on("SIGINT", () => {
  clearTimeout(timeout);
  clearInterval(promptInterval);
  drizzleKit.kill("SIGTERM");
  process.exit(130);
});

process.on("SIGTERM", () => {
  clearTimeout(timeout);
  clearInterval(promptInterval);
  drizzleKit.kill("SIGTERM");
  process.exit(143);
});
