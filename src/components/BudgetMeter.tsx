"use client";

import { Fragment, type ReactNode } from "react";
import type { BudgetState, BudgetStatus } from "@/lib/aggregate";
// Short figures: a meter is read at a glance, and full peso amounts push the
// group name off the row. Exact amounts live on the entry list.
import { formatMoneyShort as formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/types";

const TONE: Record<BudgetState, { text: string; bar: string }> = {
  under: { text: "text-text", bar: "var(--income)" },
  "past-goal": { text: "text-warn", bar: "var(--warn)" },
  near: { text: "text-warn", bar: "var(--warn)" },
  over: { text: "text-expense", bar: "var(--expense)" },
};

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
  const { limit, goal, spent, scale, toGoal } = status;
  const tone = TONE[status.state];
  const filled = Math.min(status.ratio, 1) * 100;
  const pastGoal = toGoal !== null && toGoal < 0;

  // Pace is judged against what she is aiming for, not the hard stop.
  const target = goal ?? limit ?? 0;
  const aheadOfPace =
    pace !== null && status.state !== "over" && !pastGoal && target > 0 && spent / target > pace;

  // The goal only gets its own marker when it sits inside a ceiling's bar.
  const goalMarker = limit !== null && goal !== null && goal < limit ? (goal / limit) * 100 : null;

  const parts: ReactNode[] = [];
  if (status.state === "over" && limit !== null) {
    parts.push(
      <span className="font-medium text-expense">
        Over limit by {formatMoney(spent - limit, currency)}
      </span>
    );
  } else {
    if (toGoal !== null) {
      parts.push(
        pastGoal ? (
          <span className="font-medium text-warn">
            Past goal by {formatMoney(-toGoal, currency)}
          </span>
        ) : (
          <span>{formatMoney(toGoal, currency)} left to goal</span>
        )
      );
    }
    if (limit !== null) {
      parts.push(
        <span className={status.state === "near" ? "font-medium text-warn" : ""}>
          {formatMoney(limit - spent, currency)} {goal !== null ? "to limit" : "left"}
        </span>
      );
    }
    if (daysLeft !== null) {
      parts.push(
        <span>
          {daysLeft} {daysLeft === 1 ? "day" : "days"} to go
        </span>
      );
    }
    if (aheadOfPace) parts.push(<span>faster than the month</span>);
  }

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
          <span className={`font-semibold ${tone.text}`}>{formatMoney(spent, currency)}</span>
          <span className="text-muted">
            {" "}
            / {formatMoney(scale, currency)}
            {limit === null ? " goal" : ""}
          </span>
        </span>
      </div>

      <div className="relative">
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
        {goalMarker !== null ? (
          <span
            aria-hidden="true"
            title="Your goal"
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-text"
            style={{ left: `${goalMarker}%` }}
          />
        ) : null}
      </div>

      <p className="mt-1 text-xs text-muted">
        {parts.map((part, i) => (
          <Fragment key={i}>
            {i > 0 ? " · " : ""}
            {part}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
