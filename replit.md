# Artisan Collective — replit.md

## Overview

Artisan Collective is a community platform for local artisan markets and vendors. It allows event owners to create and manage market events, vendors to claim spots and post what they're bringing, and community members to browse events, track attendance, and chat with fellow artisans. The app supports area-code-based filtering so users can find events relevant to their local community.

Key features:
- Browse and create artisan market events
- Vendor posts (what vendors are bringing to each event)
- Attendance tracking (attending / interested)
- Community chat with area code filtering
- User profiles with role types: Event Owner, Vendor, General
- Stripe subscription integration (Event Owners require an active subscription)
- Admin panel for managing users and app settings

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Monorepo Layout

The project is a single repository with three main areas:

- `client/` — React frontend (Vite)
- `server/` — Express backend (Node.js/TypeScript)
- `shared/` — Shared TypeScript types, Zod schemas, and route definitions

This co-location lets the frontend and backend share schema types and API route definitions, reducing duplication and keeping types in sync.

### Frontend Architecture

- **Framework:** React 18 with TypeScript, bundled by Vite
- **Routing:** `wouter` (lightweight client-side routing)
- **State/Data Fetching:** TanStack React Query v5 — all server state is managed via query hooks in `client/src/hooks/`. Polling is used for the chat feature (`refetchInterval: 5000ms`) instead of WebSockets.
- **UI Components:** shadcn/ui (New York style) built on Radix UI primitives with Tailwind CSS
- **Forms:** `react-hook-form` + `@hookform/resolvers` with Zod validation
- **Animations:** Framer Motion for page transitions
- **Fonts:** DM Sans (body), Playfair Display (headings), loaded from Google Fonts
- **Theme:** Warm artisan palette using CSS custom properties (HSL variables), dark mode supported via Tailwind `darkMode: ["class"]`

Pages (`client/src/pages/`):
| Page | Route |
|------|-------|
| Home (event list) | `/` |
| Event Detail | `/events/:id` |
| Add Event | `/events/new` |
| Community Chat | `/chat` |
| Profile | `/profile` |
| Admin Panel | `/admin` |

### Backend Architecture

- **Framework:** Express.js on Node.js with TypeScript (`tsx` for development)
- **Entry point:** `server/index.ts` → `server/routes.ts`
- **Storage layer:** `server/storage.ts` defines an `IStorage` interface (`DatabaseStorage` implementation) that wraps all DB operations via Drizzle ORM
- **Build:** esbuild bundles the server for production, Vite handles the client. The `script/build.ts` script orchestrates both.
- **Dev server:** Vite middleware runs inside the Express server in development (`server/vite.ts`)

### Database

- **Database:** PostgreSQL via `drizzle-orm/node-postgres` (connection pool from `pg`)
- **ORM:** Drizzle ORM with Drizzle Kit for migrations (`drizzle.config.ts`)
- **Schema location:** `shared/schema.ts` (app tables) + `shared/models/auth.ts` (auth tables)
- **Migrations output:** `./migrations/`

**Core tables:**
| Table | Purpose |
|-------|---------|
| `users` | Auth user records (Replit Auth) |
| `sessions` | Session storage (connect-pg-simple) |
| `user_profiles` | Extended profile: type, area code, bio, Stripe IDs, admin flag |
| `events` | Market events with location, date, vendor space capacity |
| `event_dates` | Extra/recurring dates for an event |
| `event_attendance` | User → event attendance status (attending / interested) |
| `vendor_posts` | Vendor announcements per event (what they're bringing) |
| `messages` | Community chat messages, optionally scoped by area code |
| `admin_settings` | Key/value store for admin-configurable settings |

### Authentication

- **Provider:** Replit Auth (OpenID Connect via `openid-client` + Passport.js)
- **Sessions:** Stored in PostgreSQL using `connect-pg-simple` with a 7-day TTL
- **Middleware:** `isAuthenticated` middleware in `server/replit_integrations/auth/replitAuth.ts` guards protected routes
- **Auth storage:** Separate `AuthStorage` class handles `users` table CRUD; app logic uses `storage.ts` for everything else
- **Frontend:** `useAuth` hook queries `/api/auth/user`; login/logout redirect to `/api/login` and `/api/logout`

### Authorization / Roles

- **Profile types:** `event_owner`, `vendor`, `general` — stored in `user_profiles.profileType`
- **Admin flag:** `user_profiles.isAdmin` boolean; admin routes check this server-side
- **Subscription gate:** Event owners must have an active Stripe subscription to create events

### API Structure

All API routes are defined as typed constants in `shared/routes.ts` using the `api` object. This is used on both the server (route registration) and client (URL building). Routes are grouped by resource:
- `/api/profile` — user profile CRUD
- `/api/events` — event list, detail, create
- `/api/events/:eventId/attendance` — set/remove attendance
- `/api/events/:eventId/posts` — vendor posts per event
- `/api/messages` — community chat
- `/api/admin/settings`, `/api/admin/users` — admin panel
- `/api/stripe/*` — Stripe checkout, portal, subscription status
- `/api/auth/user`, `/api/login`, `/api/logout` — Replit Auth

### Shared Code

`shared/` is imported by both client and server via TypeScript path aliases (`@shared/*`). It contains:
- `schema.ts` — Drizzle table definitions + Zod insert schemas (via `drizzle-zod`)
- `routes.ts` — Typed API route map + `buildUrl` helper
- `models/auth.ts` — Auth-specific Drizzle tables (`users`, `sessions`)

## External Dependencies

### Replit Auth (OpenID Connect)
- Used for user authentication; requires `REPL_ID` and `ISSUER_URL` env vars (defaults to `https://replit.com/oidc`)
- Sessions stored in Postgres; requires `SESSION_SECRET` env var

### PostgreSQL
- Required via `DATABASE_URL` env var
- Used for all data storage including sessions

### Stripe
- Used for subscription billing (Event Owners need a paid subscription to create events)
- Required env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (configured via admin panel), `STRIPE_WEBHOOK_SECRET`
- Webhook endpoint handles subscription status updates
- Frontend hooks: `useSubscriptionStatus`, `useCreateCheckout`, `usePortalSession`

### Google Fonts
- DM Sans and Playfair Display loaded via `<link>` in `client/index.html`

### Unsplash
- Used for placeholder/hero images throughout the UI (no API key needed for embed URLs)

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret |
| `REPL_ID` | Replit app ID for OpenID Connect |
| `ISSUER_URL` | OIDC issuer (defaults to `https://replit.com/oidc`) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `ADMIN_EMAILS` | Comma-separated emails allowed to claim admin |