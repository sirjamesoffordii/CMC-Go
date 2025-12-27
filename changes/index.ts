import "dotenv/config";
import express from "express";
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startupDbHealthCheck, checkDbHealth } from "./db-health";
import { validateEnv, ENV } from './env';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Validate required environment variables before anything else. If
  // validation fails, an exception is thrown and the process will
  // terminate. Doing this check here prevents the server from
  // starting with missing configuration and makes failures obvious in
  // logs.
  try {
    validateEnv();
  } catch (error) {
    console.error('[Startup] Environment validation failed. Server will not start.');
    console.error('[Startup] Fix the missing variables and try again.');
    process.exit(1);
  }
  // Perform startup database health check
  // This will throw if critical schema issues are detected
  try {
    await startupDbHealthCheck();
  } catch (error) {
    console.error("[Startup] Database health check failed. Server will not start.");
    console.error("[Startup] Fix the database schema issues and try again.");
    process.exit(1);
  }

  const app = express();
  const server = createServer(app);
  // -------------------------------------------------------------------------
  // Security & middleware configuration
  //
  // Use a reasonable rate limiter to mitigate brute‑force attacks and limit
  // accidental abuse. This limiter restricts each IP to 100 requests per 15
  // minute window. Adjust these numbers based on expected traffic patterns.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Add Helmet to set a collection of sensible HTTP headers that improve
  // security such as Content‑Security‑Policy, X‑Frame‑Options and others.
  app.use(helmet());

  // Configure CORS. When CORS_ORIGIN is set in the environment, only those
  // origins (comma separated) will be allowed. If empty, all origins are
  // permitted. Credentials are allowed to enable cookies for sessions.
  const allowedOrigins = ENV.corsOrigin?.split(',').map(o => o.trim()).filter(Boolean);
  app.use(cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  }));
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // -----------------------------------------------------------------------
  // Health check endpoint
  //
  // Expose a simple health endpoint that can be used by load balancers
  // and uptime monitoring services to verify that the service is alive
  // and able to talk to the database. This endpoint intentionally
  // returns minimal information to avoid leaking internal state. It is
  // available in all environments.
  app.get('/healthz', async (req, res) => {
    try {
      // Try a simple database query to ensure the connection pool is working
      // Reuse the existing database health check to verify that the
      // connection and critical tables are present. If any errors are
      // returned the call will throw and be caught below.
      await checkDbHealth();
      res.status(200).send('OK');
    } catch (err) {
      // If the DB connection fails or health check throws, return a
      // 503 to signal that the service is unhealthy. We do not include
      // error details for security reasons.
      res.status(503).send('Unhealthy');
    }
  });
  
  // Development-only debug endpoint for database health
  if (process.env.NODE_ENV === "development") {
    app.get("/api/debug/db-health", async (req, res) => {
      try {
        const health = await checkDbHealth();
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          ...health,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    });
    console.log("[Debug] Database health endpoint available at /api/debug/db-health");
  }
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
