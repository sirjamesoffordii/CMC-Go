#!/usr/bin/env node
/**
 * validate-agents.mjs
 *
 * Validates agent and prompt files in .github/agents/ and .github/prompts/
 * Checks for required YAML frontmatter fields and valid references.
 *
 * Usage: node scripts/validate-agents.mjs
 * Exit codes: 0 = pass, 1 = validation errors
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Configuration
const AGENTS_DIR = join(ROOT, ".github", "agents");
const PROMPTS_DIR = join(ROOT, ".github", "prompts");

// Required fields for different file types
const REQUIRED_FIELDS = {
  agent: ["name", "description"],
  prompt: ["name", "description"],
};

// Collect all valid agent names for handoff validation
const validAgentNames = new Set();

let errors = [];
let warnings = [];
let stats = { agents: 0, prompts: 0 };

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content, filePath) {
  // Normalize line endings to LF
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const match = normalizedContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const yaml = match[1];
  const result = {};

  // Simple YAML parser for our use case
  const lines = yaml.split("\n");
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check for inline array (tools: ['a', 'b'])
    const inlineArrayMatch = line.match(/^(\w+):\s*\[(.+)\]$/);
    if (inlineArrayMatch) {
      const [, key, arrayContent] = inlineArrayMatch;
      result[key] = arrayContent.split(",").map((s) => s.trim().replace(/['"]/g, ""));
      currentKey = null;
      currentArray = null;
      continue;
    }

    // Check for array item
    if (line.startsWith("  - ")) {
      if (currentArray) {
        currentArray.push(line.replace("  - ", "").trim());
      }
      continue;
    }

    // Check for key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;

      if (value) {
        // Remove quotes from value
        result[key] = value.replace(/^["']|["']$/g, "");
        currentArray = null;
      } else {
        // Array or object follows
        result[key] = [];
        currentArray = result[key];
      }
    }
  }

  return result;
}

/**
 * Validate a single agent file
 */
function validateAgentFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const frontmatter = parseFrontmatter(content, filePath);
  const relativePath = filePath.replace(ROOT, "");

  if (!frontmatter) {
    errors.push(`${relativePath}: Missing YAML frontmatter`);
    return;
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS.agent) {
    if (!frontmatter[field]) {
      errors.push(`${relativePath}: Missing required field '${field}'`);
    }
  }

  // Collect agent name for handoff validation
  if (frontmatter.name) {
    validAgentNames.add(frontmatter.name);
  }

  stats.agents++;
  console.log(`✓ ${relativePath}`);
  return frontmatter;
}

/**
 * Validate a single prompt file
 */
function validatePromptFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const frontmatter = parseFrontmatter(content, filePath);
  const relativePath = filePath.replace(ROOT, "");

  if (!frontmatter) {
    errors.push(`${relativePath}: Missing YAML frontmatter`);
    return;
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS.prompt) {
    if (!frontmatter[field]) {
      errors.push(`${relativePath}: Missing required field '${field}'`);
    }
  }

  stats.prompts++;
  console.log(`✓ ${relativePath}`);
  return frontmatter;
}

/**
 * Second pass: validate handoffs reference valid agents
 */
function validateHandoffs(allFiles) {
  for (const { path, frontmatter } of allFiles) {
    if (frontmatter?.handoffs && Array.isArray(frontmatter.handoffs)) {
      for (const handoff of frontmatter.handoffs) {
        if (!validAgentNames.has(handoff)) {
          warnings.push(
            `${path.replace(ROOT, "")}: Handoff target '${handoff}' not found in agent files`
          );
        }
      }
    }
  }
}

/**
 * Main validation runner
 */
function main() {
  console.log("🔍 Validating agent files...\n");

  const allFiles = [];

  // Validate agent files
  if (existsSync(AGENTS_DIR)) {
    const agentFiles = readdirSync(AGENTS_DIR).filter(
      (f) => f.endsWith(".md") && f !== "README.md"
    );

    for (const file of agentFiles) {
      const filePath = join(AGENTS_DIR, file);
      const frontmatter = validateAgentFile(filePath);
      if (frontmatter) {
        allFiles.push({ path: filePath, frontmatter });
      }
    }
  }

  console.log("\n🔍 Validating prompt files...\n");

  // Validate prompt files
  if (existsSync(PROMPTS_DIR)) {
    const promptFiles = readdirSync(PROMPTS_DIR).filter(
      (f) => f.endsWith(".md") && f !== "README.md"
    );

    for (const file of promptFiles) {
      const filePath = join(PROMPTS_DIR, file);
      const frontmatter = validatePromptFile(filePath);
      if (frontmatter) {
        allFiles.push({ path: filePath, frontmatter });
      }
    }
  }

  // Second pass: validate handoffs
  console.log("\n🔗 Validating handoff references...\n");
  validateHandoffs(allFiles);

  // Report results
  console.log("=".repeat(50));
  console.log(`\n📊 Stats: ${stats.agents} agents, ${stats.prompts} prompts`);

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    for (const warning of warnings) {
      console.log(`   ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    for (const error of errors) {
      console.log(`   ${error}`);
    }
    console.log("\n❌ Validation FAILED");
    process.exit(1);
  }

  console.log("\n✅ All agent/prompt files valid");
  process.exit(0);
}

main();
