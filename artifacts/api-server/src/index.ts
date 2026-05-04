import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";

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
