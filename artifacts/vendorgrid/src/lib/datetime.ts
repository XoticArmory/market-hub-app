/**
 * Local-wall-clock conversion helpers for datetime-local inputs.
 *
 * Time model (verified 2026-10-26): the API returns event instants as
 * ISO strings with a Z suffix (true UTC instants). A datetime-local input
 * holds a wall clock with no timezone, interpreted in the VISITOR's local
 * timezone. So:
 * - Display: instant -> local wall clock (never toISOString, which is UTC
 *   and shows e.g. 17:00 for a 10:00 AM MST event).
 * - Submit: local wall clock -> ISO with Z, parsed in the browser so the
 *   visitor's timezone (including DST) is applied. The server parses the
 *   Z-suffixed value to the same instant regardless of its own timezone.
 * Sending a raw wall-clock string to the server is the old bug: the server
 * parses it as UTC and the listing shifts by the UTC offset.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** API instant -> "YYYY-MM-DDTHH:mm" in the visitor's local timezone. */
export function toLocalInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** datetime-local wall clock -> ISO string with Z, parsed in local time. */
export function fromLocalInputValue(local: string | null | undefined): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}
