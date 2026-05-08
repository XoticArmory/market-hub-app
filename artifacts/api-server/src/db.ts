import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db";
import dns from "dns";

// Force IPv4 to ensure compatibility with Supabase from all hosting environments
dns.setDefaultResultOrder("ipv4first");

const { Pool } = pg;

const rawConnectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// ---------------------------------------------------------------------------
// Supabase offers two PgBouncer modes on different ports:
//
//   Transaction mode — aws-1-*.pooler.supabase.com:6543
//     Server connections are shared per-transaction.  Only a few server slots
//     exist.  If they fill up (e.g., from a query storm) every new client waits
//     up to 15 s (query_wait_timeout) before getting ECHECKOUTTIMEOUT.
//
//   Session mode — aws-0-*.pooler.supabase.com:5432
//     One server connection per client session.  No query_wait_timeout.
//     Prepared statements work.  Fine for small pools (max: 3).
//
// We upgrade from Transaction → Session so the saturated server-connection pool
// can no longer block us.
// ---------------------------------------------------------------------------
function upgradeToSessionMode(cs: string): string {
  // Only handle Supabase Transaction-mode pooler URLs.
  // Use plain string replacement so the password is NEVER decoded/re-encoded
  // (URL parsing can corrupt passwords that contain % or + characters).
  if (
    cs.includes(":6543") &&
    cs.includes("pooler.supabase.com")
  ) {
    // aws-1-<region>.pooler.supabase.com:6543  →  aws-0-<region>.pooler.supabase.com:5432
    const result = cs
      .replace(/:6543(\/|$|\?)/, ":5432$1")
      .replace(/aws-\d+-([^.]+\.pooler\.supabase\.com)/, "aws-0-$1");
    console.log("[db] Upgraded PgBouncer Transaction → Session mode (:6543 → :5432)");
    return result;
  }
  return cs;
}

const connectionString = upgradeToSessionMode(rawConnectionString);

export const pool = new Pool({
  connectionString,
  // 3 connections is plenty and keeps us well under Supabase's free-tier limit.
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
