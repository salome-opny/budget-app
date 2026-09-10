"use client";

import { useMemo, useState } from "react";
import BackupCard from "@/components/BackupCard";
import GroupBudgetFields from "@/components/GroupBudgetFields";
import ManageList from "@/components/ManageList";
import { Button, Card, Field, PageHeader, Segmented, inputClass } from "@/components/ui";
import db from "@/lib/db";
import { useCategories, useGroups, useSettings, useTxns } from "@/lib/hooks";
import {
  addCategory,
  addGroup,
  deleteCategory,
  deleteGroup,
  renameCategory,
  renameGroup,
  saveSettings,
} from "@/lib/mutations";
import { formatMoney } from "@/lib/money";
import type { Currency, Kind } from "@/lib/types";

export default function SettingsPage() {
  const settings = useSettings();
  const txns = useTxns();
  const groups = useGroups();
  const categories = useCategories();

  const [lens, setLens] = useState<Kind>("expense");
  const [rateDraft, setRateDraft] = useState<string | null>(null);

  const usage = useMemo(() => {
    const byGroup = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const t of txns ?? []) {
      byGroup.set(t.groupId, (byGroup.get(t.groupId) ?? 0) + 1);
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + 1);
    }
    return { byGroup, byCategory };
  }, [txns]);

  const rate = rateDraft ?? String(settings.copPerUsd);
  const groupsForLens = (groups ?? []).filter((g) => g.kind === lens);
  const categoriesForLens = (categories ?? []).filter((c) => c.kind === lens);

  async function commitRate() {
    const value = Number(rate.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(value) && value > 0) await saveSettings({ copPerUsd: value });
    setRateDraft(null);
  }

  async function eraseEverything() {
    if (!confirm("Delete every entry, group and category on this device?")) return;
    if (!confirm("Last chance. This cannot be undone and no backup is taken. Continue?"))
      return;
    await db.delete();
    location.reload();
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={`${txns?.length ?? 0} entries stored on this device`}
      />

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold">Currency</h2>
          <p className="mt-1 text-sm text-muted">
            Entries keep the currency you paid in. Totals are shown converted into your
            main currency.
          </p>
          <div className="mt-4 space-y-3">
            <Field label="Main currency">
              <div className="flex overflow-hidden rounded-xl border border-border">
                {(["USD", "COP"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => saveSettings({ primaryCurrency: c })}
                    aria-pressed={settings.primaryCurrency === c}
                    className={`flex-1 py-2.5 text-sm font-medium ${
                      settings.primaryCurrency === c
                        ? "bg-accent text-bg"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Exchange rate"
              hint={`1 USD = ${formatMoney(settings.copPerUsd, "COP")}. Update it whenever the rate moves.`}
            >
              <input
                value={rate}
                inputMode="decimal"
                onChange={(e) => setRateDraft(e.target.value)}
                onBlur={commitRate}
                aria-label="Colombian pesos per US dollar"
                className={`${inputClass} tnum`}
              />
            </Field>
          </div>
        </Card>

        <Segmented
          label="Editing"
          options={[
            { id: "expense" as Kind, label: "Expenses" },
            { id: "income" as Kind, label: "Income" },
          ]}
          value={lens}
          onChange={setLens}
        />

        <Card>
          <h2 className="text-sm font-semibold">
            {lens === "expense" ? "Expense groups" : "Income sources"}
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            {lens === "expense"
              ? "Each group gets its own tab on the Expenses page. Give one a monthly limit, the most you allow yourself, and a goal for what you actually aim to spend."
              : "Separate tabs on the Income page. Keep one if you do not need the split."}
          </p>
          <ManageList
            items={groupsForLens}
            usage={usage.byGroup}
            noun="group"
            onRename={renameGroup}
            onAdd={(name) => addGroup(name, lens).then(() => undefined)}
            onDelete={deleteGroup}
            renderDetail={
              lens === "expense"
                ? (item) => {
                    const g = groupsForLens.find((x) => x.id === item.id);
                    return g ? <GroupBudgetFields group={g} settings={settings} /> : null;
                  }
                : undefined
            }
          />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">
            {lens === "expense" ? "Expense categories" : "Income categories"}
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            The &ldquo;type&rdquo; you filter and total by. Renaming one updates every
            entry using it.
          </p>
          <ManageList
            items={categoriesForLens}
            usage={usage.byCategory}
            noun="category"
            onRename={renameCategory}
            onAdd={(name) => addCategory(name, lens).then(() => undefined)}
            onDelete={deleteCategory}
          />
        </Card>

        <BackupCard lastBackupAt={settings.lastBackupAt} />

        <Card>
          <h2 className="text-sm font-semibold">Start over</h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Wipes everything and resets to the default groups and categories. Export a
            backup first if you might want any of it back.
          </p>
          <Button variant="danger" onClick={eraseEverything}>
            Erase all data
          </Button>
        </Card>

        <p className="px-1 pb-2 text-center text-xs text-muted">
          Budget · data stored locally in this browser, never uploaded.
        </p>
      </div>
    </>
  );
}
