---
name: Inventory section architecture
description: How the Inventory feature is structured — schema, endpoints, and frontend pages.
---

The Inventory section is Pro-gated (same check as COGS tracker and My Files).

**Schema additions** (lib/db/src/schema/schema.ts):
- `vendorCatalog`: added `images text[]`, `variations text[]`
- `vendorCatalogAssignments`: added `afterMarketReport boolean`, `reportGenerated boolean`
- New table `vendorInventorySales`: vendorId, catalogItemId, eventId, quantitySold, soldAt

**Why:** The old `imageUrl` single field was insufficient for multi-photo items; variations support size/color/etc. `afterMarketReport` on the assignment record triggers a future report. Sales are tracked in a separate append-only table so history is preserved even if assignments change.

**Backend endpoints:**
- `POST /api/vendor/catalog` — accepts `images[]`, `variations[]`
- `PATCH /api/vendor/catalog/:id` — accepts `images[]`, `variations[]`
- `POST /api/vendor/catalog/:id/assign` — accepts `afterMarketReport: boolean`
- `POST /api/vendor/inventory/sales` — log a sale (catalogItemId, eventId, quantitySold)
- `GET /api/vendor/inventory/sales?eventId=` — list sales, optionally by event
- `GET /api/vendor/inventory/event-summary/:eventId` — aggregate per-item totals for an event

**Frontend routes:**
- `/inventory` → `pages/inventory.tsx` — hub with 5 action cards + dialogs
- `/inventory/events/:eventId` → `pages/inventory-event.tsx` — per-event sell-through + Log Sale
- `/inventory/analytics` → `pages/inventory-analytics.tsx` — revenue/performance analytics

**Events data sources in inventory.tsx:**
- "Manage Events" dialog → `/api/vendor/cogs/events` (only events with existing catalog assignments)
- "Allocate to Event" dialog → `/api/events` (all active events)
