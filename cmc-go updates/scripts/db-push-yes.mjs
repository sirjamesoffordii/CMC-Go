#!/usr/bin/env node
/**
 * Non-interactive wrapper for drizzle-kit push
 * Automatically confirms prompts to avoid interactive blocking
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Spawn drizzle-kit push with auto-confirm
const drizzleKit = spawn("npx", ["drizzle-kit", "push"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    // Some tools respect CI=true to skip prompts
    CI: "true",
  },
});

drizzleKit.on("close", (code) => {
  if (code !== 0) {
    console.error(`\n❌ drizzle-kit push failed with exit code ${code}`);
    process.exit(code);
  } else {
    console.log("\n✅ Schema pushed successfully");
  }
});

drizzleKit.on("error", (error) => {
  console.error("❌ Failed to spawn drizzle-kit:", error);
  process.exit(1);
});

