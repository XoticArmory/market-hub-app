import { US_STATES } from "./zip-to-state";

// localStorage keys for the Community Board's state filter.
const SAVED_STATE_KEY = "vg-state-filter";
const GEO_TRIED_KEY = "vg-geo-tried";

/**
 * The state filter the visitor last had active — either auto-detected on a
 * first visit or picked by hand in the state dropdown. Returns null when no
 * preference has ever been saved (first visit), and "" when the visitor
 * explicitly chose "All states".
 */
export function getSavedStateFilter(): string | null {
  try {
    const saved = localStorage.getItem(SAVED_STATE_KEY);
    if (saved === null) return null;
    if (saved === "") return "";
    return US_STATES.some((s) => s.abbr === saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Persist the active state filter ("" = all states) so it sticks across visits. */
export function saveStateFilter(state: string): void {
  try {
    localStorage.setItem(SAVED_STATE_KEY, state);
  } catch {
    // Private browsing or blocked storage: filtering still works this visit.
  }
}

/** True once a geolocation lookup has been attempted (granted, denied, or failed). */
export function hasTriedGeoDetection(): boolean {
  try {
    return localStorage.getItem(GEO_TRIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGeoDetectionTried(): void {
  try {
    localStorage.setItem(GEO_TRIED_KEY, "1");
  } catch {
    // Ignore: worst case the lookup is attempted again next visit.
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 86400000,
    });
  });
}

/**
 * Detect the visitor's US state: browser geolocation (the visitor's own
 * permission prompt) + a free keyless reverse-geocode to turn coordinates
 * into a state. Returns null on any failure — denial, timeout, lookup
 * failure, or a non-US location — so callers fall back to showing all states.
 * Coordinates are sent only to OpenStreetMap's Nominatim for the lookup;
 * nothing is sent to VendorGrid's servers.
 */
export async function detectUserState(): Promise<string | null> {
  try {
    const position = await getPosition();
    const { latitude, longitude } = position.coords;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const address = data?.address ?? {};

    // Nominatim's ISO code is the reliable field, e.g. "US-MT".
    const iso =
      typeof address["ISO3166-2-lvl4"] === "string"
        ? address["ISO3166-2-lvl4"]
        : null;
    if (iso && iso.startsWith("US-")) {
      const abbr = iso.slice(3).toUpperCase();
      if (US_STATES.some((s) => s.abbr === abbr)) return abbr;
    }
    // Fallback: match the state name ("Montana").
    if (typeof address.state === "string") {
      const byName = US_STATES.find(
        (s) => s.name.toLowerCase() === address.state.toLowerCase(),
      );
      if (byName) return byName.abbr;
    }
    return null;
  } catch {
    return null;
  }
}
