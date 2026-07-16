import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";
import { pool } from "./db";
import cron from "node-cron";
import { generateReportsForEvent, generateReportsForEventDay } from "./services/market-report";
import { storage } from "./storage";

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

  // Daily at 02:00 — multi-day event day rollover:
  // For every event day (main date + event_dates rows) that expired yesterday,
  // generate a per-day report for each vendor, deduct that day's sold inventory
  // from catalog stock, and update assignment quantities so the next day starts fresh.
  cron.schedule("0 2 * * *", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    logger.info({ date: yesterday.toISOString().slice(0, 10) }, "day-rollover-cron: processing expired event days");
    try {
      const eventDays = await storage.getEventDaysEndingOn(yesterday);
      if (eventDays.length === 0) {
        logger.info("day-rollover-cron: no event days ended yesterday");
        return;
      }
      for (const { eventId, date } of eventDays) {
        try {
          const vendorIds = await storage.getProVendorsWithAssignmentsAtEvent(eventId);
          logger.info({ eventId, date: date.toISOString().slice(0, 10), vendorCount: vendorIds.length }, "day-rollover-cron: processing event day");
          for (const vendorId of vendorIds) {
            const reportResult = await generateReportsForEventDay(eventId, date, vendorId);
            const itemsUpdated = await storage.deductSoldInventoryForDay(vendorId, eventId, date);
            logger.info({ vendorId, eventId, date: date.toISOString().slice(0, 10), ...reportResult, itemsUpdated }, "day-rollover-cron: vendor processed");
          }
        } catch (err) {
          logger.error({ eventId, err }, "day-rollover-cron: error processing event day");
        }
      }
    } catch (err) {
      logger.error({ err }, "day-rollover-cron: unexpected top-level error");
    }
  });

  // Hourly — after-market report automation: generate reports for vendors who flagged
  // after_market_report = true on assignments for events that ended in the last 25 hours.
  cron.schedule("30 * * * *", async () => {
    logger.info("after-market-report-cron: checking pending flagged assignments");
    try {
      const pending = await storage.getPendingAfterMarketReportAssignments();
      for (const { vendorId, eventId } of pending) {
        logger.info({ vendorId, eventId }, "after-market-report-cron: generating report");
        const result = await generateReportsForEvent(eventId, vendorId);
        if (result.generated > 0) {
          await storage.markAfterMarketReportGenerated(vendorId, eventId);
          logger.info({ vendorId, eventId }, "after-market-report-cron: report saved and marked generated");
        } else {
          logger.info({ vendorId, eventId, ...result }, "after-market-report-cron: skipped");
        }
      }
    } catch (err) {
      logger.error({ err }, "after-market-report-cron: unexpected error");
    }
  });

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

  // Force-exit after 3 s — don't let hanging Supabase connections block
  // the Railway rolling deploy (new instance starts while old one lingers).
  setTimeout(() => {
    logger.error("Shutdown timeout — forcing exit");
    process.exit(1);
  }, 3_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
