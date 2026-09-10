"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breakdown from "@/components/Breakdown";
import BudgetCard from "@/components/BudgetCard";
import { Card, PageHeader, Segmented } from "@/components/ui";
import {
  budgetStatuses,
  byCategory,
  byGroup,
  filterTxns,
  sumPrimary,
} from "@/lib/aggregate";
import { budgetMonthFor, PERIODS, periodRange, type PeriodId } from "@/lib/dates";
import { useCategories, useGroups, useSettings, useTxns } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import type { Kind } from "@/lib/types";

export default function SummaryPage() {
  const settings = useSettings();
  const txns = useTxns();
  const groups = useGroups();
  const categories = useCategories();

  const [period, setPeriod] = useState<PeriodId>("this-month");
  const [lens, setLens] = useState<Kind>("expense");

  const currency = settings.primaryCurrency;

  const view = useMemo(() => {
    if (!txns || !groups || !categories) return null;
    const scoped = filterTxns(txns, periodRange(period));
    const income = scoped.filter((t) => t.kind === "income");
    const expense = scoped.filter((t) => t.kind === "expense");
    const lensTxns = lens === "income" ? income : expense;
    return {
      incomeTotal: sumPrimary(income, settings),
      expenseTotal: sumPrimary(expense, settings),
      groupSlices: byGroup(
        lensTxns,
        settings,
        groups.filter((g) => g.kind === lens)
      ),
      categorySlices: byCategory(
        lensTxns,
        settings,
        categories.filter((c) => c.kind === lens)
      ),
      budgets: budgetStatuses(txns, settings, groups, budgetMonthFor(period)),
      count: scoped.length,
      totalCount: txns.length,
    };
  }, [txns, groups, categories, settings, period, lens]);

  if (!view) return <LoadingSummary />;

  const net = view.incomeTotal - view.expenseTotal;

  return (
    <>
      <PageHeader
        title="Summary"
        subtitle={`Everything in ${currency} · ${view.count} ${
          view.count === 1 ? "entry" : "entries"
        }`}
      />

      <div className="space-y-4">
        <Segmented
          label="Period"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />

        <Card className="!p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Net for this period
          </p>
          <p
            className={`tnum mt-1 text-4xl font-semibold tracking-tight ${
              net >= 0 ? "text-income" : "text-expense"
            }`}
          >
            {net < 0 ? "−" : ""}
            {formatMoney(Math.abs(net), currency)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">Income</p>
              <p className="tnum mt-0.5 font-semibold text-income">
                {formatMoney(view.incomeTotal, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">Expenses</p>
              <p className="tnum mt-0.5 font-semibold text-expense">
                {formatMoney(view.expenseTotal, currency)}
              </p>
            </div>
          </div>
        </Card>

        {view.totalCount > 0 ? (
          <BudgetCard
            statuses={view.budgets}
            currency={currency}
            month={budgetMonthFor(period)}
          />
        ) : null}

        {view.totalCount === 0 ? (
          <Card>
            <p className="font-medium">Nothing tracked yet</p>
            <p className="mt-1 text-sm text-muted">
              Add your first entry from the{" "}
              <Link href="/expenses" className="underline">
                Expenses
              </Link>{" "}
              or{" "}
              <Link href="/income" className="underline">
                Income
              </Link>{" "}
              tab. Everything you enter stays on this device.
            </p>
          </Card>
        ) : (
          <>
            <Segmented
              label="Show"
              options={[
                { id: "expense" as Kind, label: "Expenses" },
                { id: "income" as Kind, label: "Income" },
              ]}
              value={lens}
              onChange={setLens}
            />

            <Card>
              <h2 className="mb-3 text-sm font-semibold">
                By {lens === "income" ? "source" : "group"}
              </h2>
              <Breakdown slices={view.groupSlices} currency={currency} />
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold">By category</h2>
              <Breakdown slices={view.categorySlices} currency={currency} />
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function LoadingSummary() {
  return (
    <>
      <PageHeader title="Summary" />
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-44 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    </>
  );
}
