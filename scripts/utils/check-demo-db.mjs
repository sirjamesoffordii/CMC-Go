#!/usr/bin/env node
/**
 * Utility to check if DATABASE_URL points to Railway demo DB
 * Used by destructive scripts to prevent accidental execution
 */

export function isDemoDatabase(connectionString) {
  if (!connectionString) {
    return false;
  }

  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();

    // Check for Railway demo DB patterns
    const demoDbPatterns = [
      "railway.internal",
      "proxy.rlwy.net",
      "up.railway.app",
      "railway.app",
    ];

    return demoDbPatterns.some(pattern => host.includes(pattern));
  } catch (_error) {
    return false;
  }
}

export function checkNotDemoDatabase(connectionString, scriptName) {
  if (isDemoDatabase(connectionString)) {
    console.error(`❌ SAFETY CHECK FAILED`);
    console.error(
      `   ${scriptName} cannot be run against the shared Railway staging demo DB.`
    );
    console.error();
    console.error(
      `   This script would modify the shared database used by the staging website.`
    );
    console.error(`   Use a local database for development instead.`);
    console.error();
    console.error(`   To use a local database:`);
    console.error(`   1. Set up a local MySQL instance`);
    console.error(`   2. Update DATABASE_URL in .env to point to localhost`);
    console.error(`   3. Run migrations: pnpm db:migrate`);
    console.error();
    process.exit(1);
  }
}
