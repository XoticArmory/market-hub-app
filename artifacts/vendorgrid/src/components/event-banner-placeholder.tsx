import { Store } from "lucide-react";

/**
 * Branded fallback for listings with no banner image. A warm brown-to-orange
 * panel with the VendorGrid mark — never a random stock photo, so a
 * bannerless listing still looks like it belongs to VendorGrid.
 *
 * On the detail hero the event title already overlays the panel, so the
 * wordmark is hidden there (showWordmark={false}) to avoid the two texts
 * colliding; the centered store icon alone carries the branding.
 */
export function EventBannerPlaceholder({
  className = "",
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#412b22] via-[#6b3a1f] to-[#c2410c] text-[#fff3e7] ${className}`}
      role="img"
      aria-label="VendorGrid market event"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
        <Store className="h-6 w-6" aria-hidden="true" />
      </span>
      {showWordmark && (
        <>
          <span className="font-display text-lg font-bold tracking-tight">VendorGrid</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Market event
          </span>
        </>
      )}
    </div>
  );
}
