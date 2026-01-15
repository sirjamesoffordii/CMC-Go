import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";


// Configure React plugin - disable fastRefresh in development if CSP causes issues
// This helps with CSP nonce compatibility
const plugins = [
  react({
    // Disable fast refresh if CSP nonce issues occur
    // fastRefresh: false, // Uncomment if CSP still causes preamble detection issues
    // Use esbuild instead of Babel for better performance and TypeScript support
    babel: {
      parserOpts: {
        plugins: ['typescript', 'jsx']
      }
    }
  }), 
  tailwindcss(), 
  // jsxLocPlugin(), // Disabled: incompatible with Vite 7.x (requires Vite 4 or 5)
  // vitePluginManusRuntime() // Temporarily disabled to test build
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir:"../dist/public",
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
