import fs from "node:fs";
import path from "node:path";

// TypeScript incremental cache can occasionally hold stale file paths after renames/moves.
// Removing it keeps `pnpm check` deterministic across environments.
const tsBuildInfoPath = path.resolve("node_modules/typescript/tsbuildinfo");

try {
  fs.rmSync(tsBuildInfoPath, { force: true });
} catch {
  // ignore
}
