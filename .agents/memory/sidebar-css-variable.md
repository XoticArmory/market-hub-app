---
name: Sidebar CSS variable mismatch
description: bg-sidebar was transparent due to missing --sidebar variable in index.css
---

The Tailwind config maps `bg-sidebar` → `hsl(var(--sidebar))`, but index.css only defined `--sidebar-background`. The missing `--sidebar` variable made the sidebar fully transparent on mobile (rendered as a sheet/overlay).

**Fix:** Add `--sidebar: <same value as --sidebar-background>` to both `:root` and `.dark` in `src/index.css`.

**Why:** The shadcn/ui sidebar component uses `bg-sidebar` in its SheetContent className for the mobile drawer. Without `--sidebar` defined, the color resolves to nothing and the background is transparent.

**How to apply:** Any time the mobile sidebar (or any element using `bg-sidebar`) appears transparent, check that `--sidebar` is defined in index.css alongside `--sidebar-background`.
