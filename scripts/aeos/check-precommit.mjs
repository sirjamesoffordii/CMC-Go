import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

function isGitDirDirectory(repoRoot) {
  const gitPath = path.join(repoRoot, ".git");
  try {
    const stat = fs.statSync(gitPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const repoRoot = run("git rev-parse --show-toplevel");

// Enforce "no commits from main repo" unless explicitly allowed.
if (isGitDirDirectory(repoRoot) && process.env.AEOS_ALLOW_MAIN_REPO !== "1") {
  fail(
    "[AEOS] Refusing to commit from main repo (non-worktree).\n" +
      "      Use a git worktree, or set AEOS_ALLOW_MAIN_REPO=1 to override."
  );
}

const branchName = run("git branch --show-current");
if (!branchName) {
  fail("[AEOS] Detached HEAD: refusing to commit.");
}

const strict = process.env.AEOS_STRICT === "1";
if (strict && !branchName.startsWith("agent/")) {
  fail(
    `[AEOS] Branch '${branchName}' is not an agent branch. Expected prefix: agent/.`
  );
}

const stagedFiles = run("git diff --cached --name-only")
  .split("\n")
  .filter(Boolean);

const forbiddenPatterns = [
  /^board.*\\.json$/,
  /^coverage\//,
  /^test-results\//,
  /^\.github\/agents\/heartbeat\.json$/,
];

const forbidden = stagedFiles.filter(filePath =>
  forbiddenPatterns.some(rx => rx.test(filePath))
);

if (forbidden.length > 0 && process.env.AEOS_ALLOW_FORBIDDEN_STAGE !== "1") {
  fail(
    "[AEOS] Forbidden files are staged (likely artifacts). Unstage them before committing:\n" +
      forbidden.map(f => `  - ${f}`).join("\n") +
      "\n\nSet AEOS_ALLOW_FORBIDDEN_STAGE=1 to override."
  );
}

// Gentle warning when staging looks suspiciously large.
if (
  stagedFiles.length >= 25 &&
  process.env.AEOS_SUPPRESS_STAGE_WARNING !== "1"
) {
  process.stderr.write(
    `[AEOS] Warning: ${stagedFiles.length} files staged. Consider splitting the change.\n`
  );
}
