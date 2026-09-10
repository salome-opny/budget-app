"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState, PageHeader, Segmented } from "@/components/ui";
import {
  byCategory,
  filterTxns,
  monthlyTotals,
  monthsWithData,
  sumPrimary,
} from "@/lib/aggregate";
import {
  currentMonthKey,
  lastMonths,
  monthLabelMedium,
  monthLabelShort,
  shiftMonth,
} from "@/lib/dates";
import { useCategories, useSettings, useTxns } from "@/lib/hooks";
import { formatCompact, formatMoney, formatMoneyWhole } from "@/lib/money";
import type { Currency, Kind } from "@/lib/types";

const SPANS = [
  { id: "6", label: "6 months" },
  { id: "12", label: "12 months" },
];

/** Inclusive month bounds as ISO dates, so `filterTxns` can use them directly. */
function monthBounds(key: string) {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}` };
}

export default function TrendsPage() {
  const settings = useSettings();
  const txns = useTxns();
  const categories = useCategories();

  const [span, setSpan] = useState("6");
  const [lens, setLens] = useState<Kind>("expense");
  const thisMonth = currentMonthKey();
  const [monthA, setMonthA] = useState(thisMonth);
  const [monthB, setMonthB] = useState(shiftMonth(thisMonth, -1));

  const currency = settings.primaryCurrency;

  const chart = useMemo(() => {
    if (!txns) return null;
    const months = lastMonths(thisMonth, Number(span));
    return monthlyTotals(txns, settings, months).map((row) => ({
      ...row,
      label: monthLabelShort(row.month),
    }));
  }, [txns, settings, span, thisMonth]);

  const comparison = useMemo(() => {
    if (!txns || !categories) return null;
    const scoped = categories.filter((c) => c.kind === lens);
    const build = (key: string) => {
      const rows = filterTxns(txns, { ...monthBounds(key), kind: lens });
      return {
        slices: byCategory(rows, settings, scoped),
        total: sumPrimary(rows, settings),
      };
    };
    const a = build(monthA);
    const b = build(monthB);
    const names = new Map<string, string>();
    for (const s of [...a.slices, ...b.slices]) names.set(s.id, s.name);
    const rows = [...names.entries()]
      .map(([id, name]) => {
        const aTotal = a.slices.find((s) => s.id === id)?.total ?? 0;
        const bTotal = b.slices.find((s) => s.id === id)?.total ?? 0;
        return { id, name, a: aTotal, b: bTotal, delta: aTotal - bTotal };
      })
      .filter((r) => r.a !== 0 || r.b !== 0)
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    return { a, b, rows };
  }, [txns, categories, settings, monthA, monthB, lens]);

  const available = useMemo(() => {
    const withData = txns ? monthsWithData(txns) : [];
    const set = new Set([...withData, thisMonth, shiftMonth(thisMonth, -1)]);
    return [...set].sort().reverse();
  }, [txns, thisMonth]);

  if (!chart || !comparison) {
    return (
      <>
        <PageHeader title="Trends" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
      </>
    );
  }

  const hasData = chart.some((r) => r.income !== 0 || r.expense !== 0);

  return (
    <>
      <PageHeader title="Trends" subtitle={`Month by month, in ${currency}`} />

      <div className="space-y-4">
        <Segmented label="Span" options={SPANS} value={span} onChange={setSpan} />

        {!hasData ? (
          <EmptyState
            title="No history yet"
            body="Once you have entries in a couple of months, the comparison shows up here."
          />
        ) : (
          <>
            <Card>
              <h2 className="mb-3 text-sm font-semibold">Income vs expenses</h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompact(Number(v) || 0, currency)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--text)",
                      }}
                      formatter={(value, name) => [
                        formatMoney(Number(value) || 0, currency),
                        name === "income" ? "Income" : "Expenses",
                      ]}
                    />
                    <Bar dataKey="income" fill="var(--income)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--expense)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold">Net per month</h2>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompact(Number(v) || 0, currency)}
                    />
                    <ReferenceLine y={0} stroke="var(--muted)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--text)",
                      }}
                      formatter={(value) => [
                        formatMoney(Number(value) || 0, currency),
                        "Net",
                      ]}
                    />
                    <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                      {chart.map((row) => (
                        <Cell
                          key={row.month}
                          fill={row.net >= 0 ? "var(--income)" : "var(--expense)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold">Compare two months</h2>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MonthSelect value={monthA} onChange={setMonthA} options={available} />
                <MonthSelect value={monthB} onChange={setMonthB} options={available} />
              </div>
              <div className="mb-4">
                <Segmented
                  label="Show"
                  options={[
                    { id: "expense" as Kind, label: "Expenses" },
                    { id: "income" as Kind, label: "Income" },
                  ]}
                  value={lens}
                  onChange={setLens}
                />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-2.5">
                <span />
                <span className="min-w-[3.25rem] text-right text-[10px] font-medium uppercase tracking-wide text-muted">
                  {monthLabelShort(monthA)}
                </span>
                <span className="min-w-[3.25rem] text-right text-[10px] font-medium uppercase tracking-wide text-muted">
                  {monthLabelShort(monthB)}
                </span>
                <span className="min-w-[3.25rem] text-right text-[10px] font-medium uppercase tracking-wide text-muted">
                  Change
                </span>

                <DeltaRow
                  label="Total"
                  a={comparison.a.total}
                  b={comparison.b.total}
                  currency={currency}
                  lens={lens}
                  bold
                />

                {comparison.rows.length === 0 ? null : (
                  <span className="col-span-4 my-1.5 h-px bg-border" />
                )}

                {comparison.rows.map((r) => (
                  <DeltaRow
                    key={r.id}
                    label={r.name}
                    a={r.a}
                    b={r.b}
                    currency={currency}
                    lens={lens}
                  />
                ))}
              </div>

              {comparison.rows.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  No entries in either month.
                </p>
              ) : null}

              <p className="mt-3 text-xs text-muted">
                Change is {monthLabelMedium(monthA)} minus {monthLabelMedium(monthB)}.
                Green is the direction you want.
              </p>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function MonthSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Month"
      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {monthLabelMedium(m)}
        </option>
      ))}
    </select>
  );
}

/** Renders four cells into the parent grid, so columns line up across rows. */
function DeltaRow({
  label,
  a,
  b,
  currency,
  lens,
  bold = false,
}: {
  label: string;
  a: number;
  b: number;
  currency: Currency;
  lens: Kind;
  bold?: boolean;
}) {
  const delta = a - b;
  // Spending less is the win; earning more is the win.
  const good = lens === "income" ? delta > 0 : delta < 0;
  const tone =
    Math.abs(delta) < 0.5 ? "text-muted" : good ? "text-income" : "text-expense";
  const weight = bold ? "font-semibold" : "";
  return (
    <>
      <span className={`min-w-0 truncate py-1 text-xs ${weight}`}>{label}</span>
      <span className={`tnum min-w-[3.25rem] py-1 text-right text-xs ${weight}`}>
        {formatMoneyWhole(a, currency)}
      </span>
      <span className={`tnum min-w-[3.25rem] py-1 text-right text-xs text-muted ${weight}`}>
        {formatMoneyWhole(b, currency)}
      </span>
      <span className={`tnum min-w-[3.25rem] py-1 text-right text-xs ${tone} ${weight}`}>
        {delta > 0 ? "+" : delta < 0 ? "−" : ""}
        {formatMoneyWhole(Math.abs(delta), currency)}
      </span>
    </>
  );
}
