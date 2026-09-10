"use client";

import Link from "next/link";
import BudgetMeter from "./BudgetMeter";
import { Card } from "./ui";
import type { BudgetStatus } from "@/lib/aggregate";
import { currentMonthKey, daysLeftInMonth, monthLabel, monthProgress } from "@/lib/dates";
import type { Currency } from "@/lib/types";

export default function BudgetCard({
  statuses,
  currency,
  month,
  title = "Budget",
  emptyHint = true,
}: {
  statuses: BudgetStatus[];
  currency: Currency;
  /** Ceilings are monthly, so the card always names the month it is about. */
  month: string;
  title?: string;
  emptyHint?: boolean;
}) {
  const isCurrentMonth = month === currentMonthKey();
  // Pace only means something while the month is still running.
  const pace = isCurrentMonth ? monthProgress(month) : null;
  const daysLeft = isCurrentMonth ? daysLeftInMonth(month) : null;

  if (statuses.length === 0) {
    if (!emptyHint) return null;
    return (
      <Card>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          No limits or goals set. Add them per group in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to see how much of the month you have left.
        </p>
      </Card>
    );
  }

  const count = (state: BudgetStatus["state"]) =>
    statuses.filter((s) => s.state === state).length;
  const over = count("over");
  const near = count("near");
  const pastGoal = count("past-goal");
  const groupsAre = (n: number) => (n === 1 ? "1 group is" : `${n} groups are`);

  // Only the most urgent message; stacking three banners would bury the numbers.
  const banner =
    over > 0
      ? { tone: "bg-expense/12 text-expense", text: `${groupsAre(over)} over the limit` }
      : near > 0
        ? { tone: "bg-warn/12 text-warn", text: `${groupsAre(near)} close to the limit` }
        : pastGoal > 0
          ? { tone: "bg-warn/12 text-warn", text: `${groupsAre(pastGoal)} past the goal` }
          : null;

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted">{monthLabel(month)}</span>
      </div>

      {/* Redundant when the card is already showing that one group. */}
      {statuses.length > 1 && banner ? (
        <p className={`mb-3 rounded-xl px-3 py-2 text-xs font-medium ${banner.tone}`}>
          {banner.text}
        </p>
      ) : null}

      <div className="space-y-4">
        {statuses.map((s) => (
          <BudgetMeter
            key={s.groupId}
            status={s}
            currency={currency}
            pace={pace}
            daysLeft={daysLeft}
          />
        ))}
      </div>
    </Card>
  );
}
