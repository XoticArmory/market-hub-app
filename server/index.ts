import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Schema migrations: add nullable event context columns to vendor_inventory
  try {
    await pool.query(`
      ALTER TABLE vendor_inventory
        ALTER COLUMN event_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS event_title text,
        ADD COLUMN IF NOT EXISTS event_date timestamptz;
    `);
    log("Schema migration: vendor_inventory columns ensured");
  } catch (e: any) {
    // Columns may already exist or NOT NULL constraint already dropped — safe to ignore
    if (!e.message?.includes("already exists") && !e.message?.includes("does not exist")) {
      log(`Schema migration warning: ${e.message}`);
    }
  }

  // Create anonymous event clicks table if not exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anonymous_event_clicks (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_anon_clicks_event_id ON anonymous_event_clicks(event_id);
      CREATE INDEX IF NOT EXISTS idx_anon_clicks_created_at ON anonymous_event_clicks(created_at);
    `);
    log("Schema migration: anonymous_event_clicks table ensured");
  } catch (e: any) {
    log(`Schema migration warning: ${e.message}`);
  }

  // Add contact_email column to events table
  try {
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_email text;`);
    log("Schema migration: events.contact_email column ensured");
  } catch (e: any) {
    log(`Schema migration warning: ${e.message}`);
  }

  // Add event_website_url column to events table
  try {
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_website_url text;`);
    log("Schema migration: events.event_website_url column ensured");
  } catch (e: any) {
    log(`Schema migration warning: ${e.message}`);
  }

  // Add event_vendor_entries table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_vendor_entries (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        added_by VARCHAR NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        email TEXT,
        verification_code TEXT,
        matched_user_id VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    log("Schema migration: event_vendor_entries table ensured");
  } catch (e: any) {
    log(`Schema migration warning: ${e.message}`);
  }

  // Reset all serial sequences to prevent duplicate key errors after data imports
  try {
    const serialTables = [
      'events', 'event_dates', 'event_attendance', 'event_maps',
      'vendor_registrations', 'vendor_posts', 'vendor_catalog', 'vendor_catalog_assignments',
      'vendor_inventory', 'notifications', 'roadmap_items', 'promo_codes',
      'user_profiles',
    ];
    for (const table of serialTables) {
      await pool.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
          false
        );
      `);
    }
    log("Schema migration: serial sequences reset");
  } catch (e: any) {
    log(`Sequence reset warning: ${e.message}`);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
