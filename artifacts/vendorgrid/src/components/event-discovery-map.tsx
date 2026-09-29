import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./event-discovery-map.css";

export type EventPinColor = "admin" | "pro" | "default";

export interface DiscoveryMapEvent {
  id: number | string;
  title: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  pinColor?: EventPinColor | null;
  date?: string | Date | null;
  endTime?: string | Date | null;
  location?: string | null;
  bannerUrl?: string | null;
  imageUrl?: string | null;
}

export interface EventDiscoveryMapProps {
  /** Pass the currently filtered events; the map fits only these events. */
  events: DiscoveryMapEvent[];
  /** Change this from a card click to pan to, pulse, and open that event's pin. */
  selectedEventId?: number | string | null;
  className?: string;
}

const PIN_LABELS: Record<EventPinColor, string> = {
  admin: "Admin-owned",
  pro: "Pro-owned",
  default: "Other events",
};

function pinColor(value: DiscoveryMapEvent["pinColor"]): EventPinColor {
  return value === "admin" || value === "pro" ? value : "default";
}

function coordinates(event: DiscoveryMapEvent): L.LatLngTuple | null {
  if (event.latitude === null || event.latitude === undefined || event.latitude === "" ||
      event.longitude === null || event.longitude === undefined || event.longitude === "") return null;
  const latitude = Number(event.latitude);
  const longitude = Number(event.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return [latitude, longitude];
}

function formatSchedule(event: DiscoveryMapEvent): string | null {
  if (!event.date) return null;
  const start = new Date(event.date);
  if (Number.isNaN(start.getTime())) return null;
  const date = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start);
  if (!event.endTime) return `${date} · ${time}`;
  const end = new Date(event.endTime);
  if (Number.isNaN(end.getTime())) return `${date} · ${time}`;
  return `${date} · ${time}–${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(end)}`;
}

function createPin(color: EventPinColor, selected: boolean): L.DivIcon {
  const tone = color === "admin" ? "yellow" : color === "pro" ? "green" : "brand";
  return L.divIcon({
    className: `vg-map-pin vg-map-pin--${tone}${selected ? " vg-map-pin--selected" : ""}`,
    html: '<span class="vg-map-pin__halo"></span><span class="vg-map-pin__face"><span class="vg-map-pin__center"></span></span>',
    iconSize: [38, 44],
    iconAnchor: [19, 41],
    popupAnchor: [0, -37],
  });
}

function makePopup(event: DiscoveryMapEvent): HTMLElement {
  const root = document.createElement("div");
  root.className = "vg-map-popup";

  const image = event.bannerUrl || event.imageUrl;
  if (image && /^(https?:\/\/|\/(?!\/))/i.test(image)) {
    const img = document.createElement("img");
    img.className = "vg-map-popup__image";
    img.src = image;
    img.alt = "";
    img.loading = "lazy";
    root.append(img);
  }

  const body = document.createElement("div");
  body.className = "vg-map-popup__body";
  const eyebrow = document.createElement("div");
  eyebrow.className = "vg-map-popup__eyebrow";
  eyebrow.textContent = PIN_LABELS[pinColor(event.pinColor)];
  body.append(eyebrow);
  const title = document.createElement("h3");
  title.className = "vg-map-popup__title";
  title.textContent = event.title;
  body.append(title);
  const schedule = formatSchedule(event);
  for (const line of [schedule, event.location]) {
    if (!line) continue;
    const row = document.createElement("p");
    row.className = "vg-map-popup__meta";
    row.textContent = line;
    body.append(row);
  }
  const actions = document.createElement("div");
  actions.className = "vg-map-popup__actions";
  const detail = document.createElement("a");
  detail.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/events/${encodeURIComponent(String(event.id))}`;
  detail.className = "vg-map-popup__detail";
  detail.textContent = "View details";
  detail.setAttribute("aria-label", `View details for ${event.title}`);
  detail.dataset.testid = `link-event-details-${event.id}`;
  actions.append(detail);
  body.append(actions);
  root.append(body);
  return root;
}

/**
 * Leaflet map for filtered market discovery. Does not geocode: events without
 * valid coordinates stay out of bounds and out of the marker layer.
 */
export function EventDiscoveryMap({ events, selectedEventId, className = "" }: EventDiscoveryMapProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const selectedRef = useRef<string | null>(null);
  const latestEventsRef = useRef(events);
  latestEventsRef.current = events;

  const visibleEvents = useMemo(() => events.flatMap(event => {
    const point = coordinates(event);
    return point ? [{ event, point }] : [];
  }), [events]);

  // A stable signature avoids resetting the user's pan on unrelated parent renders.
  const eventSignature = JSON.stringify(visibleEvents.map(({ event, point }) => [
    String(event.id), ...point, event.pinColor, event.title, event.date, event.endTime,
    event.location, event.bannerUrl, event.imageUrl,
  ]));

  useEffect(() => {
    if (!nodeRef.current) return;
    const map = L.map(nodeRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: false,
      scrollWheelZoom: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(nodeRef.current);
    return () => {
      resizeObserver.disconnect();
      layer.clearLayers();
      map.remove();
      markersRef.current.clear();
      layerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const { event, point } of visibleEvents) {
      const id = String(event.id);
      const marker = L.marker(point, {
        icon: createPin(pinColor(event.pinColor), id === selectedRef.current),
        keyboard: true,
        title: `${event.title} — ${PIN_LABELS[pinColor(event.pinColor)]}`,
        alt: `${event.title} map pin`,
      }).addTo(layer);
      marker.bindPopup(makePopup(event), {
        className: "vg-map-popup-shell",
        maxWidth: 292,
        minWidth: 230,
        autoPanPadding: L.point(16, 16),
      });
      markersRef.current.set(id, marker);
    }
    if (visibleEvents.length === 1) map.setView(visibleEvents[0].point, 11, { animate: false });
    else if (visibleEvents.length > 1) {
      map.fitBounds(L.latLngBounds(visibleEvents.map(item => item.point)), {
        padding: [38, 38],
        maxZoom: 12,
        animate: false,
      });
    } else map.setView([39.8283, -98.5795], 4, { animate: false });
  }, [eventSignature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const previous = selectedRef.current;
    const current = selectedEventId === null || selectedEventId === undefined ? null : String(selectedEventId);
    selectedRef.current = current;
    if (previous && previous !== current) {
      const previousMarker = markersRef.current.get(previous);
      const previousEvent = latestEventsRef.current.find(item => String(item.id) === previous);
      if (previousMarker && previousEvent) previousMarker.setIcon(createPin(pinColor(previousEvent.pinColor), false));
    }
    if (!current) return;
    const marker = markersRef.current.get(current);
    const event = latestEventsRef.current.find(item => String(item.id) === current);
    if (!marker || !event) return;
    marker.setIcon(createPin(pinColor(event.pinColor), true));
    marker.setZIndexOffset(1000);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: !reduceMotion, duration: 0.7 });
    marker.openPopup();
  }, [selectedEventId, eventSignature]);

  return (
    <section className={`vg-discovery-map ${className}`.trim()} aria-label="Event discovery map" data-testid="section-event-discovery-map">
      <div className="vg-discovery-map__heading">
        <div>
          <p className="vg-discovery-map__kicker">EXPLORE NEAR YOU</p>
          <h2 className="vg-discovery-map__title">Markets on the map</h2>
        </div>
        <span className="vg-discovery-map__count" data-testid="text-mapped-event-count">
          {visibleEvents.length} {visibleEvents.length === 1 ? "place" : "places"}
        </span>
      </div>
      <div className="vg-discovery-map__legend" aria-label="Map pin legend">
        {(Object.keys(PIN_LABELS) as EventPinColor[]).map(color => (
          <span className="vg-discovery-map__legend-item" key={color}>
            <span className={`vg-discovery-map__legend-dot vg-discovery-map__legend-dot--${color === "admin" ? "yellow" : color === "pro" ? "green" : "brand"}`} aria-hidden="true" />
            {PIN_LABELS[color]}
          </span>
        ))}
      </div>
      <p className="vg-discovery-map__footnote">Pins show approximate ZIP-code areas, not exact event addresses. Open an event for its full location.</p>
      <div className="vg-discovery-map__canvas-wrap">
        <div ref={nodeRef} className="vg-discovery-map__canvas" role="application" aria-label={`Interactive map with ${visibleEvents.length} events. Use arrow keys to pan and plus or minus to zoom.`} data-testid="map-events" />
        {visibleEvents.length === 0 && (
          <div className="vg-discovery-map__empty" role="status" data-testid="status-map-empty">
            <span className="vg-discovery-map__empty-mark" aria-hidden="true" />
            <strong>No mapped events yet</strong>
            <span>Try another filter, or check back as new markets are added.</span>
          </div>
        )}
      </div>
      {visibleEvents.length < events.length && (
        <p className="vg-discovery-map__footnote" data-testid="text-unmapped-events">
          {events.length - visibleEvents.length} {events.length - visibleEvents.length === 1 ? "event has" : "events have"} no map location and {events.length - visibleEvents.length === 1 ? "is" : "are"} not shown.
        </p>
      )}
    </section>
  );
}

export default EventDiscoveryMap;