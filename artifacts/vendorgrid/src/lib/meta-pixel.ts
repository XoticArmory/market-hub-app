// Meta Pixel event helpers (dataset "VendorGrid", base code lives in index.html).
// The fbq stub is defined synchronously by the head snippet, so calls made
// before the external library arrives are queued, not dropped.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const TRIAL_EVENT_KEY = "vg-pixel-trial-tracked";

export function trackTrialStart() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "StartTrial");
}

// Stripe checkout returns here: {returnTo || /profile}?subscribed=vendor_pro&session_id=...
// That query param only appears after a completed Pro checkout, so it is the
// trial-start signal. Guarded per session so refreshes don't double-fire.
export function trackSubscribedReturn() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("subscribed") !== "vendor_pro") return;
  try {
    if (window.sessionStorage.getItem(TRIAL_EVENT_KEY)) return;
    window.sessionStorage.setItem(TRIAL_EVENT_KEY, "1");
  } catch {
    // Storage unavailable: still fire once for this page load.
  }
  trackTrialStart();
}
