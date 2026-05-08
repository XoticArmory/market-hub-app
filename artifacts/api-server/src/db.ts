import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db";
import dns from "dns";

// Force IPv4 to ensure compatibility with Supabase from all hosting environments
dns.setDefaultResultOrder("ipv4first");

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString,
  // Keep pool small so we don't pile up connections on Supabase.
  // With the circuit breaker in routes.ts, at most 1 connection attempt
  // is in flight at any given time during recovery.
  max: 3,
  // Release idle connections quickly so they don't linger between restarts.
  idleTimeoutMillis: 10_000,
  // Fail fast locally if no pool slot is available.
  connectionTimeoutMillis: 5_000,
  // Allow the process to exit even if a connection is still open.
  allowExitOnIdle: true,
});

// Log pool errors instead of letting them crash the process.
pool.on("error", (err) => {
  console.error("[pool] idle client error:", err.message);
});

export const db = drizzle(pool, { schema });
