# Artisan Collective — replit.md

## Overview

Artisan Collective is a comprehensive multi-tier subscription marketplace for local artisan markets and vendors. It allows event owners to create and manage market events with interactive vendor maps, vendors to register for event spaces and post what they're bringing, and community members to browse events, track attendance, and chat. The platform features three Pro subscription tiers and a full super-admin control panel.

Key features:
- Browse and create artisan market events (all authenticated users, no fee required)
- 3 Pro subscription tiers: Event Owner Pro ($19.95/mo), Vendor Pro ($9.95/mo), General Pro ($4.95/mo)
- Event Owner Pro: push notifications to local Vendor Pros, event analytics, interactive map builder, boosted listings
- Vendor Pro: 0% platform fee on space registrations, notification receipt
- Vendor space registration with Stripe payment (0.5% platform fee for non-Vendor Pro accounts)
- Interactive event map editor (grid-based vendor spot placement)
- In-app push notifications (polling, not browser push API)
- Admin panel with stats by area code, user management, revenue tracking, Stripe price configuration
- Account onboarding flow (/setup) for new users to select their role
- Area-code-based filtering and community chat

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Monorepo Layout

- `client/` — React frontend (Vite)
- `server/` — Express backend (Node.js/TypeScript)
- `shared/` — Shared TypeScript types, Zod schemas, and route definitions

### Frontend Architecture

- **Framework:** React 18 with TypeScript, bundled by Vite
- **Routing:** `wouter` (lightweight client-side routing)
- **State/Data Fetching:** TanStack React Query v5
- **UI Components:** shadcn/ui (New York style) on Radix UI + Tailwind CSS
- **Forms:** `react-hook-form` + Zod validation
- **Fonts:** DM Sans (body), Playfair Display (headings)

Pages (`client/src/pages/`):
| Page | Route |
|------|-------|
| Home (event list) | `/` |
| Event Detail | `/events/:id` |
| Add Event | `/events/new` |
| Community Chat | `/chat` |
| Profile (with Pro tabs) | `/profile` |
| Admin Panel | `/admin` |
| Account Setup / Onboarding | `/setup` |
| Upgrade to Pro | `/upgrade` |

### Onboarding Flow

New users are redirected to `/setup` if their profile has `onboardingComplete: false`. They choose a role (Event Owner / Vendor / General), enter area code, business name, and bio. After completion, they land on the home page.

### Backend Architecture

- **Framework:** Express.js / TypeScript
- **Storage layer:** `server/storage.ts` → `DatabaseStorage` implementation via Drizzle ORM
- **Dev server:** Vite middleware embedded inside Express

### Database

- **Database:** PostgreSQL via Drizzle ORM
- **Schema:** `shared/schema.ts`

**Core tables:**
| Table | Purpose |
|-------|---------|
| `users` | Auth user records (Replit Auth) |
| `sessions` | Session storage |
| `user_profiles` | Role, area code, bio, Stripe IDs, subscriptionTier, subscriptionStatus, isAdmin, onboardingComplete |
| `events` | Market events with vendor space capacity and spot price |
| `event_dates` | Extra/recurring dates |
| `event_attendance` | Attendance status (attending / interested) |
| `vendor_posts` | Vendor announcements per event |
| `messages` | Community chat |
| `admin_settings` | Key/value store (Stripe price IDs stored here) |
| `notifications` | In-app push notifications (polled every 30s) |
| `event_maps` | JSONB vendor spot layouts per event |
| `vendor_registrations` | Vendor space bookings with payment tracking |
| `terms_acceptances` | Subscription terms acceptance log |

### Authentication & Authorization

- **Provider:** Replit Auth (OIDC)
- **Admin access:** `user_profiles.isAdmin` boolean; claimed via `/api/admin/claim` using `ADMIN_EMAILS` env var
- **Subscription tiers:** `free`, `event_owner_pro`, `vendor_pro`, `general_pro` stored in `user_profiles.subscriptionTier`

### Subscription Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| `event_owner_pro` | $19.95/mo | Push notifications, featured listings, analytics, event maps |
| `vendor_pro` | $9.95/mo | No platform fees, receive notifications |
| `general_pro` | $4.95/mo | Badge, community perks |

### Stripe Integration

- Tier price IDs stored in `admin_settings` table with keys:
  - `stripe_price_event_owner_pro`
  - `stripe_price_vendor_pro`
  - `stripe_price_general_pro`
- Checkout: POST `/api/stripe/upgrade` with `{ tier }` body
- Terms accepted in DB before Stripe checkout redirect
- Webhook updates `subscriptionTier` and `subscriptionStatus` from `checkout.session.completed`

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret |
| `REPL_ID` | Replit app ID for OIDC |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret |
| `ADMIN_EMAILS` | Comma-separated admin emails (e.g. `tbetts84@gmail.com`) |
