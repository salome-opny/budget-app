import { inRange, monthBounds, monthKey } from "./dates";
import { toPrimary, txnInPrimary } from "./money";
import type { Category, Group, Kind, Settings, Txn } from "./types";

export interface Filter {
  from?: string | null;
  to?: string | null;
  kind?: Kind;
  groupId?: string;
  categoryId?: string;
}

export function filterTxns(txns: Txn[], f: Filter): Txn[] {
  return txns.filter((t) => {
    if (f.kind && t.kind !== f.kind) return false;
    if (f.groupId && t.groupId !== f.groupId) return false;
    if (f.categoryId && t.categoryId !== f.categoryId) return false;
    return inRange(t.date, f.from ?? null, f.to ?? null);
  });
}

type Rates = Pick<Settings, "primaryCurrency" | "copPerUsd">;

export function sumPrimary(txns: Txn[], settings: Rates): number {
  return txns.reduce((acc, t) => acc + txnInPrimary(t, settings), 0);
}

export interface Slice {
  id: string;
  name: string;
  color: string;
  total: number;
  share: number;
  count: number;
}

function sliceBy(
  txns: Txn[],
  settings: Rates,
  keyOf: (t: Txn) => string,
  lookup: Map<string, { name: string; color: string }>
): Slice[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const t of txns) {
    const key = keyOf(t);
    const cur = totals.get(key) ?? { total: 0, count: 0 };
    cur.total += txnInPrimary(t, settings);
    cur.count += 1;
    totals.set(key, cur);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b.total, 0);
  return [...totals.entries()]
    .map(([id, { total, count }]) => ({
      id,
      name: lookup.get(id)?.name ?? "Deleted",
      color: lookup.get(id)?.color ?? "#8a8a8a",
      total,
      count,
      share: grand > 0 ? total / grand : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function byCategory(
  txns: Txn[],
  settings: Rates,
  categories: Category[]
): Slice[] {
  return sliceBy(
    txns,
    settings,
    (t) => t.categoryId,
    new Map(categories.map((c) => [c.id, { name: c.name, color: c.color }]))
  );
}

export function byGroup(txns: Txn[], settings: Rates, groups: Group[]): Slice[] {
  return sliceBy(
    txns,
    settings,
    (t) => t.groupId,
    new Map(groups.map((g) => [g.id, { name: g.name, color: g.color }]))
  );
}

export interface MonthTotals {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export function monthlyTotals(
  txns: Txn[],
  settings: Rates,
  months: string[]
): MonthTotals[] {
  const acc = new Map<string, MonthTotals>(
    months.map((m) => [m, { month: m, income: 0, expense: 0, net: 0 }])
  );
  for (const t of txns) {
    const row = acc.get(monthKey(t.date));
    if (!row) continue;
    const value = txnInPrimary(t, settings);
    if (t.kind === "income") row.income += value;
    else row.expense += value;
  }
  for (const row of acc.values()) row.net = row.income - row.expense;
  return months.map((m) => acc.get(m)!);
}

/** Every month that has at least one entry, oldest first. */
export function monthsWithData(txns: Txn[]): string[] {
  return [...new Set(txns.map((t) => monthKey(t.date)))].sort();
}

/** Past this share of the ceiling, the app starts warning rather than informing. */
export const NEAR_LIMIT_RATIO = 0.8;

export interface BudgetStatus {
  groupId: string;
  name: string;
  color: string;
  /** Ceiling converted into the primary currency. */
  limit: number;
  spent: number;
  /** Negative once the ceiling is blown. */
  remaining: number;
  ratio: number;
  state: "under" | "near" | "over";
}

/**
 * Ceilings are monthly, so this is always scoped to one month — never to the
 * period filter the user happens to be looking at.
 */
export function budgetStatuses(
  txns: Txn[],
  settings: Rates,
  groups: Group[],
  month: string
): BudgetStatus[] {
  const { from, to } = monthBounds(month);
  return groups
    .filter((g) => g.kind === "expense" && (g.limitAmount ?? 0) > 0)
    .map((g) => {
      const limit = toPrimary(g.limitAmount!, g.limitCurrency ?? "USD", settings);
      const spent = sumPrimary(
        filterTxns(txns, { from, to, kind: "expense", groupId: g.id }),
        settings
      );
      const ratio = limit > 0 ? spent / limit : 0;
      return {
        groupId: g.id,
        name: g.name,
        color: g.color,
        limit,
        spent,
        remaining: limit - spent,
        ratio,
        state: ratio > 1 ? "over" : ratio >= NEAR_LIMIT_RATIO ? "near" : "under",
      } satisfies BudgetStatus;
    })
    .sort((a, b) => b.ratio - a.ratio);
}
