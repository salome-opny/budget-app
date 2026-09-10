"use client";

import { useEffect, useState } from "react";
import { setGroupBudget } from "@/lib/mutations";
import { formatMoney, parseAmount, toPrimary } from "@/lib/money";
import type { Currency, Group, Settings } from "@/lib/types";

type Field = "limitAmount" | "goalAmount";

// Visible captions are short because the fields sit side by side; the
// accessible names spell out what each one is.
const LABEL: Record<Field, string> = {
  limitAmount: "Limit",
  goalAmount: "Goal",
};

const ARIA: Record<Field, string> = {
  limitAmount: "Monthly limit",
  goalAmount: "Goal",
};

function parse(raw: string, currency: Currency): number | null {
  return raw.trim() === "" ? null : parseAmount(raw, currency);
}

export default function GroupBudgetFields({
  group,
  settings,
}: {
  group: Group;
  settings: Settings;
}) {
  // A currency picked on this screen wins, then whatever the group was saved in,
  // then the main currency. Derived rather than seeded into state, so it never
  // goes stale while settings are still loading.
  const [picked, setPicked] = useState<Currency | null>(null);
  const currency = picked ?? group.budgetCurrency ?? settings.primaryCurrency;

  const [drafts, setDrafts] = useState<Record<Field, string | null>>({
    limitAmount: null,
    goalAmount: null,
  });

  const shown = (f: Field) => drafts[f] ?? (group[f] == null ? "" : String(group[f]));

  /**
   * Persist while typing rather than only on blur. iOS does not reliably fire
   * blur when the keyboard is swiped away or the app is backgrounded, and a
   * silently unsaved limit is worse than a few extra writes.
   */
  useEffect(() => {
    if (drafts.limitAmount === null && drafts.goalAmount === null) return;
    const timer = setTimeout(() => {
      void setGroupBudget(group.id, {
        ...(drafts.limitAmount !== null
          ? { limitAmount: parse(drafts.limitAmount, currency) }
          : {}),
        ...(drafts.goalAmount !== null ? { goalAmount: parse(drafts.goalAmount, currency) } : {}),
        budgetCurrency: currency,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [drafts, currency, group.id]);

  async function commit(f: Field) {
    const raw = drafts[f];
    if (raw === null) return;
    await setGroupBudget(group.id, { [f]: parse(raw, currency), budgetCurrency: currency });
    setDrafts((d) => ({ ...d, [f]: null }));
  }

  async function pickCurrency(next: Currency) {
    setPicked(next);
    // Text still being typed is re-read under the new currency's separator
    // rules. A number that is already saved stays the same number: re-parsing
    // its string would turn a stored 12.5 into 125 pesos.
    const amountFor = (f: Field) => {
      const raw = drafts[f];
      return raw !== null ? parse(raw, next) : (group[f] ?? null);
    };
    await setGroupBudget(group.id, {
      limitAmount: amountFor("limitAmount"),
      goalAmount: amountFor("goalAmount"),
      budgetCurrency: next,
    });
  }

  const limit = group.limitAmount ?? null;
  const goal = group.goalAmount ?? null;
  const inMain = (n: number) =>
    formatMoney(toPrimary(n, currency, settings), settings.primaryCurrency);

  const conversion =
    currency !== settings.primaryCurrency && (limit !== null || goal !== null)
      ? [limit !== null ? `${inMain(limit)} limit` : null, goal !== null ? `${inMain(goal)} goal` : null]
          .filter(Boolean)
          .join(" · ")
      : null;

  const input = (f: Field) => (
    <input
      value={shown(f)}
      onChange={(e) => {
        const value = e.target.value;
        setDrafts((d) => ({ ...d, [f]: value }));
      }}
      onBlur={() => commit(f)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      inputMode="decimal"
      placeholder="None"
      aria-label={`${ARIA[f]} for ${group.name}`}
      className="tnum w-full min-w-0 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-muted"
    />
  );

  const caption = (text: string) => (
    <span className="text-xs font-medium uppercase tracking-wide text-muted">{text}</span>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        {caption("Monthly budget")}
        <div className="flex overflow-hidden rounded-lg border border-border">
          {(["USD", "COP"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickCurrency(c)}
              aria-pressed={currency === c}
              aria-label={`${group.name} budget in ${c}`}
              className={`px-2 py-1 text-xs font-medium ${
                currency === c ? "bg-accent text-bg" : "bg-surface-2 text-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Side by side, not label-beside-input: a full peso figure needs the width. */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          {caption(LABEL.limitAmount)}
          {input("limitAmount")}
        </label>
        <label className="block space-y-1">
          {caption(LABEL.goalAmount)}
          {input("goalAmount")}
        </label>
      </div>

      {conversion ? (
        <p className="mt-1.5 text-xs text-muted">≈ {conversion} at your current rate</p>
      ) : null}
      {limit !== null && goal !== null && goal > limit ? (
        <p className="mt-1.5 text-xs text-warn">
          The goal is above the limit, so the limit will be hit first.
        </p>
      ) : null}
    </div>
  );
}
