-- Ghost markets: per-user access grants for events with status 'ghost'.
--
-- RUN ONCE in the Supabase SQL editor AFTER merging the ghost-markets PR.
-- The grant endpoints (POST/DELETE /api/admin/ghost-events/:id/access and the
-- ghost detail access check) will fail until this table exists.
--
-- Access goes through the API server only (same posture as the other
-- VendorGrid tables); no RLS policies are created here on purpose. Do not
-- add permissive policies without an admin review.
--
-- Deleting a ghost event removes its grants automatically (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS "ghost_event_access" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events" ("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users" ("id"),
  "granted_by" varchar NOT NULL REFERENCES "users" ("id"),
  "granted_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ghost_event_access_event_user_unique"
  ON "ghost_event_access" ("event_id", "user_id");
