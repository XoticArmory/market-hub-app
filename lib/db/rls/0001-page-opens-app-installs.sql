-- Admin trackers: Returning Users (user_page_opens) + App Downloads (app_installs).
--
-- RUN ONCE in the Supabase SQL editor AFTER the schema push
-- (pnpm --filter @workspace/db run push-force) creates these tables.
--
-- With RLS enabled and NO policies, only the server's owner/service
-- connection can access these tables, matching the posture of the other
-- VendorGrid tables. The API server queries them with its owner connection;
-- no client-side role needs access, so no policies are created here on
-- purpose. Do not add permissive policies without an admin review.

ALTER TABLE user_page_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_installs ENABLE ROW LEVEL SECURITY;
