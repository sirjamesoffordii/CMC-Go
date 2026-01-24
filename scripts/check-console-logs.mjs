import { execSync } from "node:child_process";

const stagedFiles = execSync(
  "git diff --cached --name-only --diff-filter=ACM",
  {
    encoding: "utf8",
  }
)
  .split("\n")
  .map(file => file.trim())
  .filter(Boolean);

if (stagedFiles.length === 0) {
  process.exit(0);
}

const consoleLogPattern = /console\.log\s*\(/;
const filesWithConsoleLogs = [];

for (const file of stagedFiles) {
  try {
    const fileBuffer = execSync(`git show :"${file}"`, { encoding: "buffer" });

    if (fileBuffer.includes(0)) {
      continue;
    }

    const fileText = fileBuffer.toString("utf8");
    if (consoleLogPattern.test(fileText)) {
      filesWithConsoleLogs.push(file);
    }
  } catch {
    // Ignore files that cannot be read from the index (e.g., deleted or binary)
  }
}

if (filesWithConsoleLogs.length > 0) {
  console.warn("\n⚠️  console.log detected in staged files:");
  for (const file of filesWithConsoleLogs) {
    console.warn(`  - ${file}`);
  }
  console.warn("Consider removing console.log statements before committing.\n");
}
