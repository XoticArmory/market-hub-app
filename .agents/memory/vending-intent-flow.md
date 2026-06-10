---
name: Vending Intent Flow
description: How the "I'm Vending Here" / intent_pending registration flow works end-to-end
---

## Rule
`intent_pending` is a virtual status added to `vendor_registrations` (text column, no migration needed). Any authenticated non-owner can submit one per event. Approval is handled by the event owner in the Vendor Spaces tab.

## Approval routing (approve endpoint)
- Fetch the registration first; if `status === 'intent_pending'` take the intent path.
- Free user (not vendor_pro/active): auto-create a vendor post with company name; send `intent_approved` notification.
- Pro user (vendor_pro + active, or isAdmin): just send `intent_approved` notification telling them to link inventory.
- Default (awaiting_approval): original behavior — update status + increment spacesUsed.

**Why:** Free users can't manage inventory, so auto-listing them is the right UX. Pro users already have inventory management tools.

## Frontend guard
Button is hidden when: `alreadyRegistered` (any status including intent_pending), `myPost` exists, `event.canceledAt`, or `isOwner`.

## Vendor Spaces tab visibility
Tab shows for owners even when `hasVendorSpaces === 0` if any `intent_pending` registrations exist. Pending Requests section merges both `awaiting_approval` and `intent_pending` with type-label badges.
