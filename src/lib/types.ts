export type Currency = "USD" | "COP";
export type Kind = "expense" | "income";

export interface Group {
  id: string;
  name: string;
  kind: Kind;
  order: number;
  color: string;
  /**
   * Monthly spending ceiling, or null/undefined for no ceiling. Stored with its
   * own currency like a transaction, so switching the main currency reprices it
   * instead of silently changing what it means. Only meaningful on expense
   * groups.
   */
  limitAmount?: number | null;
  limitCurrency?: Currency;
}

export interface Category {
  id: string;
  name: string;
  kind: Kind;
  order: number;
  color: string;
}

export interface Txn {
  id: string;
  /** ISO date, YYYY-MM-DD, in local time. */
  date: string;
  /** Always a positive number. `kind` carries the sign. */
  amount: number;
  currency: Currency;
  kind: Kind;
  groupId: string;
  categoryId: string;
  note: string;
  createdAt: number;
}

export interface Settings {
  id: "settings";
  primaryCurrency: Currency;
  /** How many COP one USD buys. */
  copPerUsd: number;
  lastBackupAt: number | null;
}
