---
name: Event document access
description: Durable authorization rules for documents attached to VendorGrid events.
---

Event-document visibility must be enforced by the API and protected download route, never only by hiding links in the frontend. Public files are available to everyone; paid files require an active Pro account; registered files require an active, non-rejected registration. Owners and admins can always access every document for their events.

**Why:** Direct file links bypass frontend visibility checks, while registered vendors must reliably receive organizer documents in Manage Your Markets regardless of subscription tier.

**How to apply:** Keep storage paths private from API consumers, return permission-checked download URLs, and include all authorized event documents when enriching active vendor registrations.