"use client";

import type { BudgetStatus } from "@/lib/aggregate";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/types";

const TONE = {
  under: { text: "text-text", bar: "var(--income)", label: "" },
  near: { text: "text-warn", bar: "var(--warn)", label: "Close to the limit" },
  over: { text: "text-expense", bar: "var(--expense)", label: "Over budget" },
} as const;

export default function BudgetMeter({
  status,
  currency,
  /** Share of the month already elapsed, or null when it is not the current month. */
  pace,
  daysLeft,
}: {
  status: BudgetStatus;
  currency: Currency;
  pace: number | null;
  daysLeft: number | null;
}) {
  const tone = TONE[status.state];
  const filled = Math.min(status.ratio, 1) * 100;
  // Spending faster than the month is passing, while still under the ceiling.
  const aheadOfPace = pace !== null && status.state !== "over" && status.ratio > pace;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: status.color }}
          />
          <span className="truncate text-sm font-medium">{status.name}</span>
        </span>
        <span className="tnum shrink-0 text-sm">
          <span className={`font-semibold ${tone.text}`}>
            {formatMoney(status.spent, currency)}
          </span>
          <span className="text-muted"> / {formatMoney(status.limit, currency)}</span>
        </span>
      </div>

      <div
        className="relative h-2 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuenow={Math.round(status.ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${status.name} budget used`}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.max(filled, 1.5)}%`, background: tone.bar }}
        />
        {pace !== null && pace < 1 ? (
          <span
            aria-hidden="true"
            title="Where you would be if you spent evenly through the month"
            className="absolute inset-y-0 w-px bg-text/40"
            style={{ left: `${pace * 100}%` }}
          />
        ) : null}
      </div>

      <p className="mt-1 text-xs text-muted">
        {status.state === "over" ? (
          <span className="font-medium text-expense">
            Over by {formatMoney(-status.remaining, currency)}
          </span>
        ) : (
          <>
            <span className={status.state === "near" ? "font-medium text-warn" : ""}>
              {formatMoney(status.remaining, currency)} left
            </span>
            {daysLeft !== null
              ? ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go`
              : ""}
          </>
        )}
        {aheadOfPace ? " · faster than the month" : ""}
      </p>
    </div>
  );
}
