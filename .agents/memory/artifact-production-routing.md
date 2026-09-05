---
name: Artifact production routing
description: Explains the production ownership boundary between VendorGrid's static web artifact and API service.
---

VendorGrid has two distinct production-style runtime layouts. The paid-user production site is hosted on Railway as a single service, so its API must serve the copied frontend build. Replit artifact deployments serve the web artifact separately, so their API must start without requiring frontend files.

**Why:** Enabling static serving unconditionally crashes Replit artifact publishing because its API output has no frontend directory. Disabling static serving unconditionally leaves Railway unable to deliver new frontend bundles, causing paid users on `www.vendorgrid.net` to remain on a cached older UI.

**How to apply:** Gate API-side static serving on Railway’s runtime environment (or an explicit static-serving flag). Keep Replit artifact API startup independently health-checkable without frontend files. Treat Railway and `www.vendorgrid.net` as the customer release target.