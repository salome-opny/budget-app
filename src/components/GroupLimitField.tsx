"use client";

import { useEffect, useState } from "react";
import { setGroupLimit } from "@/lib/mutations";
import { formatMoney, parseAmount, toPrimary } from "@/lib/money";
import type { Currency, Group, Settings } from "@/lib/types";

export default function GroupLimitField({
  group,
  settings,
}: {
  group: Group;
  settings: Settings;
}) {
  const saved = group.limitAmount ?? null;
  const savedCurrency = group.limitCurrency ?? "USD";
  const [draft, setDraft] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>(savedCurrency);
  const value = draft ?? (saved === null ? "" : String(saved));

  function parse(raw: string, cur: Currency): number | null {
    return raw.trim() === "" ? null : parseAmount(raw, cur);
  }

  /**
   * Persist while typing rather than only on blur. iOS does not reliably fire
   * blur when the keyboard is swiped away or the app is backgrounded, and a
   * silently unsaved budget ceiling is worse than a few extra writes.
   */
  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => {
      void setGroupLimit(group.id, parse(draft, currency), currency);
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, currency, group.id]);

  async function commit() {
    await setGroupLimit(group.id, parse(value, currency), currency);
    setDraft(null);
  }

  async function pickCurrency(next: Currency) {
    setCurrency(next);
    // Re-read the typed amount under the new currency's rules before storing.
    await setGroupLimit(group.id, parse(value, next), next);
  }

  const converted =
    saved !== null && savedCurrency !== settings.primaryCurrency
      ? toPrimary(saved, savedCurrency, settings)
      : null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
          Monthly limit
        </span>
        <input
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          inputMode="decimal"
          placeholder="None"
          aria-label={`Monthly limit for ${group.name}`}
          className="tnum min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-muted"
        />
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
          {(["USD", "COP"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickCurrency(c)}
              aria-pressed={currency === c}
              className={`px-2 py-1.5 text-xs font-medium ${
                currency === c ? "bg-accent text-bg" : "bg-surface-2 text-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {converted !== null ? (
        <p className="mt-1 text-xs text-muted">
          ≈ {formatMoney(converted, settings.primaryCurrency)} at your current rate
        </p>
      ) : null}
    </div>
  );
}
