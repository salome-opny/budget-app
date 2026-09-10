"use client";

import { useMemo, useState } from "react";
import Breakdown from "./Breakdown";
import TxnList from "./TxnList";
import TxnSheet from "./TxnSheet";
import { Card, EmptyState, FloatingAdd, PageHeader, Segmented } from "./ui";
import { byCategory, filterTxns, sumPrimary } from "@/lib/aggregate";
import { PERIODS, periodRange, type PeriodId } from "@/lib/dates";
import { useCategories, useGroups, useNameMap, useSettings, useTxns } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import type { Kind, Txn } from "@/lib/types";

const ALL = "__all__";

export default function LedgerPage({ kind }: { kind: Kind }) {
  const settings = useSettings();
  const txns = useTxns();
  const groups = useGroups(kind);
  const categories = useCategories(kind);
  const categoryNames = useNameMap(categories);
  const groupNames = useNameMap(groups);

  const [groupId, setGroupId] = useState<string>(ALL);
  const [period, setPeriod] = useState<PeriodId>("this-month");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);

  const isIncome = kind === "income";
  const currency = settings.primaryCurrency;

  const view = useMemo(() => {
    if (!txns || !categories) return null;
    const scoped = filterTxns(txns, {
      ...periodRange(period),
      kind,
      groupId: groupId === ALL ? undefined : groupId,
    });
    const listed = categoryId
      ? scoped.filter((t) => t.categoryId === categoryId)
      : scoped;
    return {
      total: sumPrimary(scoped, settings),
      listedTotal: sumPrimary(listed, settings),
      slices: byCategory(scoped, settings, categories),
      listed,
      hasAny: txns.some((t) => t.kind === kind),
    };
  }, [txns, categories, settings, period, groupId, categoryId, kind]);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(t: Txn) {
    setEditing(t);
    setSheetOpen(true);
  }

  const tabs = [
    { id: ALL, label: "All" },
    ...(groups ?? []).map((g) => ({ id: g.id, label: g.name })),
  ];
  const showTabs = (groups?.length ?? 0) > 1;

  return (
    <>
      <PageHeader
        title={isIncome ? "Income" : "Expenses"}
        subtitle={
          view
            ? `${formatMoney(view.total, currency)} · ${
                PERIODS.find((p) => p.id === period)?.label.toLowerCase() ?? ""
              }`
            : undefined
        }
      />

      <div className="space-y-4">
        {showTabs ? (
          <Segmented
            label={isIncome ? "Source" : "Group"}
            options={tabs}
            value={groupId}
            onChange={setGroupId}
          />
        ) : null}

        <Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} />

        {!view ? (
          <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        ) : !view.hasAny ? (
          <EmptyState
            title={isIncome ? "No income yet" : "No expenses yet"}
            body={
              isIncome
                ? "Tap the + button to log what came in. Nothing leaves this device."
                : "Tap the + button to log what you spent. Nothing leaves this device."
            }
          />
        ) : (
          <>
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">By category</h2>
                {categoryId ? (
                  <button
                    type="button"
                    onClick={() => setCategoryId(null)}
                    className="text-xs font-medium text-muted underline"
                  >
                    Clear filter
                  </button>
                ) : (
                  <span className="text-xs text-muted">Tap to filter</span>
                )}
              </div>
              <Breakdown
                slices={view.slices}
                currency={currency}
                onSelect={setCategoryId}
                selectedId={categoryId}
              />
            </Card>

            {categoryId ? (
              <p className="px-1 text-sm text-muted">
                Showing{" "}
                <span className="font-medium text-text">
                  {categoryNames.get(categoryId)}
                </span>{" "}
                ·{" "}
                <span className="tnum font-medium text-text">
                  {formatMoney(view.listedTotal, currency)}
                </span>
              </p>
            ) : null}

            {view.listed.length === 0 ? (
              <EmptyState
                title="Nothing in this period"
                body="Try a wider period, or clear the category filter."
              />
            ) : (
              <TxnList
                txns={view.listed}
                categoryNames={categoryNames}
                groupNames={groupNames}
                showGroup={groupId === ALL && showTabs}
                onEdit={openEdit}
              />
            )}
          </>
        )}
      </div>

      <FloatingAdd onClick={openNew} label={isIncome ? "Add income" : "Add expense"} />

      {sheetOpen ? (
        <TxnSheet
          onClose={() => setSheetOpen(false)}
          kind={kind}
          defaultGroupId={groupId === ALL ? undefined : groupId}
          editing={editing}
        />
      ) : null}
    </>
  );
}
