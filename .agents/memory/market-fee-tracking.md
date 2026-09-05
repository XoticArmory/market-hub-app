---
name: Market fee tracking
description: Defines the source-of-truth split between VendorGrid payments and externally handled registration fees.
---

VendorGrid-managed event fees must be derived from the registration/payment status and must not be manually editable by the vendor. Fees handled through email, phone, forms, or external websites use a separate vendor-controlled paid marker that does not change the registration's approval status.

**Why:** Approval and payment are separate facts for external registration methods, while VendorGrid payment status is authoritative and should not be overridden manually.

**How to apply:** Any market-management, reporting, notification, or document workflow that displays fee state must branch on the event's registration method and preserve this source-of-truth split.