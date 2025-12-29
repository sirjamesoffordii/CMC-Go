import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, static files are in dist/public (built by Vite)
  // In development, this function shouldn't be called (setupVite is used instead)
  const candidates = [
    // most common in this repo
    path.resolve(process.cwd(), "dist", "public"),
    // if server is started from dist/
    path.resolve(process.cwd(), "public"),
    // fallback: resolve relative to compiled server file location
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..", "dist", "public"),
  ];

  const distPath = candidates.find((p) => fs.existsSync(path.join(p, "index.html")))
    ?? path.resolve(process.cwd(), "dist", "public");

  if (process.env.NODE_ENV !== "production") {
    console.log("[static] cwd:", process.cwd());
    console.log("[static] candidates:", candidates);
    console.log("[static] chosen distPath:", distPath);
    console.log("[static] index exists:", fs.existsSync(path.join(distPath, "index.html")));
  }

  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] Could not find the build directory: ${distPath}, make sure to build the client first`
    );
    console.error(
      `[Static] Run 'pnpm build' to build the client before deploying to production`
    );
  } else {
    console.log(`[Static] Serving static files from: ${distPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send(`
        <html>
          <body>
            <h1>Build Error</h1>
            <p>Could not find index.html at ${indexPath}</p>
            <p>Make sure to run 'pnpm build' before deploying to production.</p>
          </body>
        </html>
      `);
    }
  });
}
