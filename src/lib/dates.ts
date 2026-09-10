export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Today as YYYY-MM-DD in the device's local timezone. */
export function todayISO(): string {
  const d = new Date();
  return isoFrom(d);
}

export function isoFrom(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "2026-09-14" -> "2026-09" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKey(todayISO());
}

/** "2026-09" -> "September 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

/** "2026-09" -> "Sep 2026" */
export function monthLabelMedium(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1].slice(0, 3)} ${y}`;
}

/** "2026-09" -> "Sep 26" */
export function monthLabelShort(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The N month keys ending at `endKey`, oldest first. */
export function lastMonths(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    shiftMonth(endKey, i - (count - 1))
  );
}

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${MONTH_NAMES[Number(m) - 1].slice(0, 3)} ${Number(d)}`;
}

export type PeriodId = "this-month" | "last-month" | "last-3" | "ytd" | "all";

export const PERIODS: Array<{ id: PeriodId; label: string }> = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3", label: "3 months" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All" },
];

/** Inclusive [from, to] ISO bounds for a period. `null` means unbounded. */
export function periodRange(id: PeriodId): { from: string | null; to: string | null } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const endOfMonth = (yy: number, mm: number) => isoFrom(new Date(yy, mm + 1, 0));
  switch (id) {
    case "this-month":
      return { from: isoFrom(new Date(y, m, 1)), to: endOfMonth(y, m) };
    case "last-month":
      return { from: isoFrom(new Date(y, m - 1, 1)), to: endOfMonth(y, m - 1) };
    case "last-3":
      return { from: isoFrom(new Date(y, m - 2, 1)), to: endOfMonth(y, m) };
    case "ytd":
      return { from: `${y}-01-01`, to: endOfMonth(y, m) };
    case "all":
      return { from: null, to: null };
  }
}

export function inRange(iso: string, from: string | null, to: string | null): boolean {
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}
