import { useEffect, useMemo, useState } from "react";

// Module-level cache so a ZIP resolved on one page is never refetched.
const zipCityCache = new Map<string, string>();

/**
 * Resolve ZIP codes to city names via api.zippopotam.us — the same source
 * the board uses for its per-ZIP city labels (places[0]["place name"]).
 * ZIPs that fail to resolve are simply absent from the map; callers treat
 * those events as unplaceable rather than guessing.
 */
export function useZipCities(zips: string[]): Record<string, string> {
  const key = useMemo(() => [...new Set(zips.filter(Boolean))].sort().join(","), [zips]);
  const [cities, setCities] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    key.split(",").filter(Boolean).forEach(zip => {
      const cached = zipCityCache.get(zip);
      if (cached) out[zip] = cached;
    });
    return out;
  });

  useEffect(() => {
    const wanted = key.split(",").filter(Boolean);
    const missing = wanted.filter(zip => !zipCityCache.has(zip));
    if (missing.length === 0) return;
    let cancelled = false;
    missing.forEach(zip => {
      fetch(`https://api.zippopotam.us/us/${zip}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          const city = data?.places?.[0]?.["place name"];
          if (city && !cancelled) {
            zipCityCache.set(zip, city);
            setCities(prev => ({ ...prev, [zip]: city }));
          }
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [key]);

  return cities;
}
