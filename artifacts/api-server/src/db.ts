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
  // Keep pool small — Supabase Transaction-mode PgBouncer has a per-role
  // connection limit. Exceeding it causes ECHECKOUTTIMEOUT.
  max: 5,
  // Release idle connections after 30 s so they don't accumulate between
  // Railway restarts.
  idleTimeoutMillis: 30_000,
  // Fail fast (5 s) instead of queuing forever; surfaces problems immediately.
  connectionTimeoutMillis: 5_000,
  // Allow the process to exit even if a connection is still held.
  allowExitOnIdle: true,
});

// Log pool errors instead of letting them crash the process.
pool.on("error", (err) => {
  console.error("[pool] idle client error:", err.message);
});

export const db = drizzle(pool, { schema });
