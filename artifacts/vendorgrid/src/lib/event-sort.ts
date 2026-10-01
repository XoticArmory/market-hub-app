type AddedEvent = {
  id: number;
  createdAt?: string | Date | null;
};

/** Newest creation timestamp first; missing/invalid timestamps go last. */
export function compareNewestAdded(a: AddedEvent, b: AddedEvent): number {
  const timestamp = (event: AddedEvent) => {
    const value = event.createdAt instanceof Date
      ? event.createdAt.getTime()
      : event.createdAt ? Date.parse(event.createdAt) : NaN;
    return Number.isFinite(value) ? value : -Infinity;
  };
  const aTime = timestamp(a);
  const bTime = timestamp(b);
  return aTime === bTime ? b.id - a.id : aTime > bTime ? -1 : 1;
}