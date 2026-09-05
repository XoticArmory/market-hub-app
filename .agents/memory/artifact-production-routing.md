---
name: Artifact production routing
description: Explains the production ownership boundary between VendorGrid's static web artifact and API service.
---

In artifact-mode production, the VendorGrid web artifact owns frontend static serving and the API service must start as an API-only process. Do not restore legacy API-side frontend static serving.

**Why:** The legacy API static server expects a client build inside the API output directory. The actual frontend is built into the separate web artifact, so enabling that legacy path crashes the API before it opens its health-check port and causes publishing to time out.

**How to apply:** Keep frontend rewrites and the static public directory in the web artifact configuration. Keep the API production command independently startable and verify its configured health endpoint without requiring frontend files.