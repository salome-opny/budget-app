"use client";

import { formatDateShort, monthLabel, monthKey } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Txn } from "@/lib/types";

export default function TxnList({
  txns,
  categoryNames,
  groupNames,
  showGroup = false,
  onEdit,
}: {
  txns: Txn[];
  categoryNames: Map<string, string>;
  groupNames: Map<string, string>;
  showGroup?: boolean;
  onEdit: (t: Txn) => void;
}) {
  const byMonth = new Map<string, Txn[]>();
  for (const t of txns) {
    const key = monthKey(t.date);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(t);
    else byMonth.set(key, [t]);
  }

  return (
    <div className="space-y-5">
      {[...byMonth.entries()].map(([month, rows]) => (
        <section key={month}>
          <h3 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted">
            {monthLabel(month)}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {categoryNames.get(t.categoryId) ?? "Uncategorized"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatDateShort(t.date)}
                      {showGroup ? ` · ${groupNames.get(t.groupId) ?? "—"}` : ""}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`tnum shrink-0 text-sm font-semibold ${
                      t.kind === "income" ? "text-income" : "text-text"
                    }`}
                  >
                    {t.kind === "income" ? "+" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
