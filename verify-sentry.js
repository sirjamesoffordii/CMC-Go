/**
 * Sentry Configuration Verification Script
 * Checks if Sentry is properly configured and working
 * 
 * Usage: npx tsx verify-sentry.js
 * 
 * Note: This script checks code files and packages reliably.
 * For .env variables, it attempts to read them but may have limitations.
 * Manually verify .env file contains:
 *   - SENTRY_DSN
 *   - VITE_SENTRY_DSN  
 *   - VITE_SENTRY_ENVIRONMENT=SirCursor
 */

import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// Read .env file directly since dotenv might not parse all variables correctly
try {
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, 'utf-8');
    const envLines = envFile.split('\n');
    envLines.forEach(line => {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          process.env[key] = cleanValue;
        }
      }
    });
  }
} catch (error) {
  console.warn('Warning: Could not read .env file directly:', error.message);
  // Fallback to dotenv
  config({ path: join(__dirname, '.env') });
}

console.log('🔍 Verifying Sentry Configuration...\n');

// Check environment variables - try both process.env and direct file reading
let envFileContent = '';
try {
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    envFileContent = readFileSync(envPath, 'utf-8');
  }
} catch (error) {
  // Ignore
}

// Helper to get env var from either source
const getEnvVar = (key) => {
  // First try process.env
  if (process.env[key]) return process.env[key];
  // Then try reading from .env file content
  if (envFileContent) {
    const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm');
    const match = envFileContent.match(regex);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
};

const checks = {
  'SENTRY_DSN (Backend)': {
    value: getEnvVar('SENTRY_DSN'),
    required: true,
    description: 'Backend Sentry DSN for server-side error tracking'
  },
  'VITE_SENTRY_DSN (Frontend)': {
    value: getEnvVar('VITE_SENTRY_DSN'),
    required: true,
    description: 'Frontend Sentry DSN for client-side error tracking'
  },
  'VITE_SENTRY_ENVIRONMENT': {
    value: getEnvVar('VITE_SENTRY_ENVIRONMENT'),
    required: true,
    expected: 'SirCursor',
    description: 'Environment tag for Sentry events'
  }
};

let allPassed = true;

console.log('📋 Environment Variables:');
console.log('─'.repeat(60));

for (const [key, check] of Object.entries(checks)) {
  const hasValue = check.value && check.value.trim() !== '';
  const isCorrect = check.expected ? check.value === check.expected : true;
  const passed = hasValue && isCorrect;
  
  if (!passed) allPassed = false;
  
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${key}`);
  console.log(`   ${check.description}`);
  
  if (check.expected) {
    console.log(`   Expected: "${check.expected}"`);
    console.log(`   Actual:   "${check.value || '(not set)'}"`);
  } else {
    console.log(`   Value: ${hasValue ? 'Set ✓' : 'Not set ✗'}`);
  }
  
  if (hasValue && !check.expected) {
    // Show first 50 chars of DSN for verification
    const preview = check.value.length > 50 
      ? check.value.substring(0, 50) + '...' 
      : check.value;
    console.log(`   Preview: ${preview}`);
  }
  console.log();
}

// Check package.json for Sentry packages
console.log('📦 Package Dependencies:');
console.log('─'.repeat(60));

try {
  const packageJsonPath = join(__dirname, 'package.json');
  if (!existsSync(packageJsonPath)) {
    console.log('❌ package.json not found');
    allPassed = false;
  } else {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const sentryPackages = {
      '@sentry/node': 'Backend error tracking',
      '@sentry/react': 'Frontend error tracking'
    };
    
    for (const [pkg, description] of Object.entries(sentryPackages)) {
      const version = deps[pkg];
      const installed = !!version;
      
      if (!installed) allPassed = false;
      
      const status = installed ? '✅' : '❌';
      console.log(`${status} ${pkg}`);
      console.log(`   ${description}`);
      console.log(`   Version: ${version || 'Not installed'}`);
      console.log();
    }
  }
} catch (error) {
  console.log('❌ Could not read package.json');
  console.log(`   Error: ${error.message}`);
  console.log();
  allPassed = false;
}

// Check code files
console.log('📁 Code Configuration:');
console.log('─'.repeat(60));

const codeChecks = [
  {
    file: 'server/_core/sentry.ts',
    description: 'Backend Sentry initialization',
    check: (content) => content.includes('initSentry') && content.includes('SENTRY_DSN')
  },
  {
    file: 'server/_core/index.ts',
    description: 'Backend Sentry import (must be first)',
    check: (content) => {
      const lines = content.split('\n');
      const firstLines = lines.slice(0, 5).join('\n');
      return firstLines.includes('initSentry') || firstLines.includes('sentry');
    }
  },
  {
    file: 'client/src/main.tsx',
    description: 'Frontend Sentry initialization',
    check: (content) => content.includes('VITE_SENTRY_DSN') && content.includes('Sentry.init')
  },
  {
    file: 'client/src/components/ErrorBoundary.tsx',
    description: 'Error boundary with Sentry integration',
    check: (content) => content.includes('Sentry.captureException')
  }
];

for (const check of codeChecks) {
  const filePath = join(__dirname, check.file);
  try {
    if (!existsSync(filePath)) {
      console.log(`❌ ${check.file}`);
      console.log(`   File not found`);
      console.log();
      allPassed = false;
      continue;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const passed = check.check(content);
    
    if (!passed) allPassed = false;
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${check.file}`);
    console.log(`   ${check.description}`);
    console.log();
  } catch (error) {
    console.log(`❌ ${check.file}`);
    console.log(`   Error reading file: ${error.message}`);
    console.log();
    allPassed = false;
  }
}

// Final summary
console.log('─'.repeat(60));
if (allPassed) {
  console.log('✅ All Sentry checks passed!');
  console.log('\n📊 Summary:');
  console.log('   • Environment variables configured');
  console.log('   • Packages installed');
  console.log('   • Code properly integrated');
  console.log('\n🚀 Sentry is ready to track errors!');
  console.log('\n💡 To test:');
  console.log('   1. Start your dev server: pnpm dev');
  console.log('   2. Visit: http://localhost:3000/api/debug/sentry-test');
  console.log('   3. Check your Sentry dashboard for the test error');
  console.log('      (Filter by environment: "SirCursor")');
} else {
  console.log('❌ Some checks failed. Please review the issues above.');
  process.exit(1);
}
