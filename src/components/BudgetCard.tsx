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
          No spending limits set. Add one per group in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to see how much of the month you have left.
        </p>
      </Card>
    );
  }

  const over = statuses.filter((s) => s.state === "over").length;
  const near = statuses.filter((s) => s.state === "near").length;

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted">{monthLabel(month)}</span>
      </div>

      {/* Redundant when the card is already showing that one group. */}
      {statuses.length > 1 && (over > 0 || near > 0) ? (
        <p
          className={`mb-3 rounded-xl px-3 py-2 text-xs font-medium ${
            over > 0 ? "bg-expense/12 text-expense" : "bg-warn/12 text-warn"
          }`}
        >
          {over > 0
            ? `${over} ${over === 1 ? "group is" : "groups are"} over budget`
            : `${near} ${near === 1 ? "group is" : "groups are"} close to the limit`}
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
