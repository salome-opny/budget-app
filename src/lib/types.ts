export type Currency = "USD" | "COP";
export type Kind = "expense" | "income";

export interface Group {
  id: string;
  name: string;
  kind: Kind;
  order: number;
  color: string;
  /**
   * Monthly spending ceiling: the most she allows herself. Null/undefined means
   * no ceiling. Only meaningful on expense groups.
   */
  limitAmount?: number | null;
  /**
   * Monthly spending goal: what she actually aims to spend, normally below the
   * ceiling. Null/undefined means no goal.
   */
  goalAmount?: number | null;
  /**
   * The one currency both the ceiling and the goal are written in. Stored the
   * way a transaction's currency is, so switching the main currency reprices
   * them instead of silently changing what they mean.
   */
  budgetCurrency?: Currency;
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
