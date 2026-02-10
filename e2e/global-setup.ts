/**
 * Playwright global setup - runs before all tests.
 * Provides clear error messages when the server is not available.
 */

import "dotenv/config";
import { FullConfig } from "@playwright/test";
import { spawn } from "node:child_process";

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) return resolve();
      reject(
        new Error(`${command} ${args.join(" ")} exited with code ${code}`)
      );
    });
  });
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://127.0.0.1:3000";
  const healthURL = `${baseURL}/readyz`;

  // If webServer is configured, Playwright handles server startup.
  // This check runs AFTER webServer startup attempt.
  // Give a brief delay for server to be fully ready.
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthURL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`
╔════════════════════════════════════════════════════════════════╗
║                    SERVER NOT READY                            ║
╠════════════════════════════════════════════════════════════════╣
║  Health check failed: ${healthURL}                     
║  Status: ${response.status} ${response.statusText}
║                                                                
║  POSSIBLE FIXES:                                               
║  1. Check if DATABASE_URL is set and valid                    
║  2. Run 'docker-compose up -d' to start MySQL                 
║  3. Run 'pnpm dev' manually to see startup errors             
╚════════════════════════════════════════════════════════════════╝
`);
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`
╔════════════════════════════════════════════════════════════════╗
║                    SERVER UNREACHABLE                          ║
╠════════════════════════════════════════════════════════════════╣
║  Could not connect to: ${healthURL}
║  Error: ${errorMessage.substring(0, 50)}
║                                                                
║  POSSIBLE FIXES:                                               
║  1. Server failed to start - check terminal output above      
║  2. DATABASE_URL not set or database not running              
║     → Run: docker-compose up -d                               
║  3. Port 3000 in use by another process                       
║     → Run: netstat -ano | findstr :3000                       
║  4. Try starting manually: pnpm dev                           
╚════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  console.log("✓ Server health check passed");

  // Ensure an e2e-loginable user exists.
  // This does NOT authenticate the browser; it only seeds an account that tests can log in with.
  if (process.env.DATABASE_URL) {
    try {
      await runCommand("node", ["scripts/seed-admin.mjs"], {
        ...process.env,
        APP_ENV: process.env.APP_ENV || "ci",
      });
      console.log("✓ Seeded admin user for e2e");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `\n[global-setup] Failed to seed admin user: ${errorMessage}`
      );
      process.exit(1);
    }
  }
}

export default globalSetup;
