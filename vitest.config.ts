import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.ts",
      "client/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json", "html"],
      reportsDirectory: "coverage",
    },
    // Use jsdom for client tests
    environmentMatchGlobs: [["client/**/*.test.{ts,tsx}", "jsdom"]],
    setupFiles: ["./client/src/test-setup.ts"],
  },
});
