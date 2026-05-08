import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";
import { pool } from "./db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: any, res: any, next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger.error({ err }, "Unhandled error");
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening");
  });
})();

// Graceful shutdown — called by Railway (SIGTERM) before the container is
// replaced. Drain in-flight HTTP requests then close the DB pool so Supabase
// doesn't accumulate ghost connections across deploys.
async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown started");

  httpServer.close(async () => {
    try {
      await pool.end();
      logger.info("DB pool drained — exiting cleanly");
    } catch (err) {
      logger.error({ err }, "Error draining pool");
    }
    process.exit(0);
  });

  // Force-exit after 10 s if something hangs
  setTimeout(() => {
    logger.error("Shutdown timeout — forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
