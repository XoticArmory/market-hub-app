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

// Append connect_timeout so individual TCP handshakes to Supabase's
// PgBouncer fail fast (5 s) rather than blocking a pool slot for 15 s.
function addConnectTimeout(cs: string, seconds = 5): string {
  return cs + (cs.includes("?") ? "&" : "?") + `connect_timeout=${seconds}`;
}

export const pool = new Pool({
  connectionString: addConnectTimeout(connectionString),
  // Keep pool small — Supabase Transaction-mode PgBouncer has a per-role
  // connection limit. Exceeding it causes ECHECKOUTTIMEOUT.
  max: 3,
  // Release idle connections quickly so they don't accumulate between restarts.
  idleTimeoutMillis: 10_000,
  // Fail fast (5 s) if no pool slot is available locally.
  connectionTimeoutMillis: 5_000,
  // Allow the process to exit even if a connection is still held.
  allowExitOnIdle: true,
});

// Log pool errors instead of letting them crash the process.
pool.on("error", (err) => {
  console.error("[pool] idle client error:", err.message);
});

export const db = drizzle(pool, { schema });
