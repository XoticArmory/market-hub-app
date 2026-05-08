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
// Supabase offers two connection endpoints:
//
//   PgBouncer pooler  — port 6543, Transaction mode, limited server slots
//   Direct PostgreSQL — port 5432, no pooler, up to 60 connections (free tier)
//
// The N+1 query storm from the old code has left PgBouncer's server pool
// saturated (ECHECKOUTTIMEOUT).  Switching to the direct connection bypasses
// PgBouncer entirely, giving us a clean slate.
//
// Supabase pooler URL format:
//   postgres://postgres.{ref}:{pass}@aws-X-us-east-X.pooler.supabase.com:6543/postgres
// Direct URL format:
//   postgres://postgres:{pass}@db.{ref}.supabase.co:5432/postgres
// ---------------------------------------------------------------------------
function resolveConnectionString(cs: string): string {
  try {
    const url = new URL(cs);
    if (url.port === "6543" && url.hostname.includes("pooler.supabase.com")) {
      // Extract project ref from username: "postgres.{ref}" → "{ref}"
      const userParts = url.username.split(".");
      if (userParts.length >= 2) {
        const projectRef = userParts.slice(1).join(".");
        url.hostname = `db.${projectRef}.supabase.co`;
        url.port = "5432";
        url.username = "postgres";
        // Remove PgBouncer-specific params (prepared statements are OK on direct)
        url.searchParams.delete("pgbouncer");
        url.searchParams.delete("connect_timeout");
        console.log(
          `[db] Switched from PgBouncer pooler → direct PostgreSQL (db.${projectRef}.supabase.co:5432)`,
        );
        return url.toString();
      }
    }
  } catch {
    // Not a URL we can parse — use as-is
  }
  return cs;
}

const connectionString = resolveConnectionString(rawConnectionString);

export const pool = new Pool({
  connectionString,
  // 3 connections is plenty for direct PostgreSQL and keeps us well under
  // Supabase's 60-connection free-tier limit.
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
