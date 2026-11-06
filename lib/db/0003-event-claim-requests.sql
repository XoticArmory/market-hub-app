-- Listing ownership-claim requests: signed-in non-owners asking to own a
-- listing, reviewed by an admin in Admin → Events (approve transfers
-- ownership, reject closes the request).
--
-- RUN ONCE in the Supabase SQL editor AFTER merging the claim-listing PR,
-- or run `pnpm --filter @workspace/db run push-force` (same effect).
-- The claim endpoints (POST /api/events/:id/claim and the admin
-- /api/admin/claim-requests routes) will fail until this table exists.
--
-- Access goes through the API server only (same posture as the other
-- VendorGrid tables); no RLS policies are created here on purpose. Do not
-- add permissive policies without an admin review.
--
-- Deleting an event removes its claim requests automatically
-- (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS "event_claim_requests" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events" ("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users" ("id"),
  "message" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now(),
  "decided_at" timestamp
);

CREATE INDEX IF NOT EXISTS "event_claim_requests_event_status_idx"
  ON "event_claim_requests" ("event_id", "status");
