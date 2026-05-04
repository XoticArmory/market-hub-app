# VendorGrid Workspace

## Overview

pnpm monorepo hosting VendorGrid — a vendor/market-event community platform for artisans and small businesses. Ported from a single-project Railway app into this multi-artifact Replit workspace.

## Architecture

| Artifact | Path | Description |
|---|---|---|
| `artifacts/vendorgrid` | `/` | React + Vite frontend (Tailwind v3, wouter, TanStack Query) |
| `artifacts/api-server` | `/api` | Express 5 backend (Drizzle ORM, Supabase auth, session-based) |
| `lib/db` | — | Shared Drizzle schema (`@workspace/db`) |

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 18, Vite 7, Tailwind CSS v3, wouter, TanStack Query, shadcn/ui
- **Backend**: Express 5, Drizzle ORM, PostgreSQL (Supabase), express-session + connect-pg-simple
- **Auth**: Supabase (email/password), session-based (not JWT)
- **Payments**: Stripe + Square checkout support
- **File uploads**: Multer → Supabase Storage
- **Build**: esbuild (backend bundle), Vite (frontend)

## Required Secrets

| Secret | Purpose |
|---|---|
| `SUPABASE_DATABASE_URL` | Supabase PostgreSQL connection string |
| `VITE_SUPABASE_URL` | Supabase project URL (for frontend client) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (for frontend client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for backend admin operations) |
| `SESSION_SECRET` | Express session secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Key Import Aliases

### Frontend (`artifacts/vendorgrid`)
- `@/` → `src/`
- `@assets/` → `attached_assets/`
- `@shared/routes` → `src/lib/shared-routes.ts` (browser-safe API route map)
- `@shared/schema` → `src/lib/shared-schema.ts` (browser-safe type stubs)
- `@shared/models/auth` → `src/lib/shared-models-auth.ts` (User type)

### Backend (`artifacts/api-server`)
- `@workspace/db` → shared Drizzle schema (types only; backend uses its own `src/db.ts` for the pool)

## Key Files

- `artifacts/api-server/src/index.ts` — server entry: creates http.Server, calls `registerRoutes()`
- `artifacts/api-server/src/app.ts` — Express app setup (CORS, JSON body, pino logger)
- `artifacts/api-server/src/routes/routes.ts` — all API routes (mounts directly at root, paths like `/api/events`)
- `artifacts/api-server/src/storage.ts` — DatabaseStorage class (all DB queries)
- `artifacts/api-server/src/replit_integrations/auth/` — Supabase session auth middleware
- `artifacts/vendorgrid/src/App.tsx` — root React component with WouterRouter + providers
- `artifacts/vendorgrid/src/lib/shared-routes.ts` — browser-safe API route definitions
- `lib/db/src/schema/` — Drizzle table definitions (schema.ts + auth.ts)

## Common Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema to Supabase (dev only)

## Notes

- The backend routes use full paths like `/api/events` — `registerRoutes()` is called directly on the Express app, not mounted under a sub-router.
- `lib/db/src/index.ts` uses `SUPABASE_DATABASE_URL || DATABASE_URL` for the connection pool.
- The Supabase URL env var is set as both `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend).
- Storage bucket creation warnings ("row-level security policy") at startup are non-fatal — buckets already exist in Supabase.
