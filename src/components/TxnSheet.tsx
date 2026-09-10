"use client";

import { useState } from "react";
import { useCategories, useGroups } from "@/lib/hooks";
import { addTxn, deleteTxn, updateTxn } from "@/lib/mutations";
import { parseAmount } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import type { Currency, Kind, Txn } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

/**
 * Mounted only while open (see LedgerPage), so plain useState initialisers are
 * enough to seed the form — no effects, no stale drafts between openings.
 */
export default function TxnSheet({
  onClose,
  kind,
  defaultGroupId,
  editing,
}: {
  onClose: () => void;
  kind: Kind;
  defaultGroupId?: string;
  editing?: Txn | null;
}) {
  const groups = useGroups(kind);
  const categories = useCategories(kind);

  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? "USD");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [groupId, setGroupId] = useState(editing?.groupId ?? defaultGroupId ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  // The lists load asynchronously, so fall back to the first option rather than
  // writing a default into state.
  const activeGroupId = groupId || groups?.[0]?.id || "";
  const activeCategoryId = categoryId || categories?.[0]?.id || "";

  const isIncome = kind === "income";

  async function submit() {
    const value = parseAmount(amount, currency);
    if (value === null || value === 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!activeGroupId || !activeCategoryId) {
      setError("Pick a group and a category.");
      return;
    }
    const payload = {
      date,
      amount: value,
      currency,
      kind,
      groupId: activeGroupId,
      categoryId: activeCategoryId,
      note: note.trim(),
    };
    if (editing) await updateTxn(editing.id, payload);
    else await addTxn(payload);
    onClose();
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    await deleteTxn(editing.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${editing ? "Edit" : "New"} ${isIncome ? "income" : "expense"}`}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 safe-bottom"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="mb-4 text-lg font-semibold">
          {editing ? "Edit" : "New"} {isIncome ? "income" : "expense"}
        </h2>

        <div className="space-y-4">
          <Field label="Amount">
            <div className="flex gap-2">
              <input
                autoFocus={!editing}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Amount"
                className={`${inputClass} tnum text-2xl font-semibold`}
              />
              <div className="flex shrink-0 overflow-hidden rounded-xl border border-border">
                {(["USD", "COP"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    aria-pressed={currency === c}
                    className={`px-3 text-sm font-medium ${
                      currency === c ? "bg-accent text-bg" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={isIncome ? "Source" : "Group"}>
              <select
                value={activeGroupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={inputClass}
              >
                {(groups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Category">
            <select
              value={activeCategoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>

          {error ? <p className="text-sm text-expense">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button onClick={submit} className="flex-1">
              {editing ? "Save changes" : "Add"}
            </Button>
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
          </div>
          {editing ? (
            <Button onClick={remove} variant="danger" className="w-full">
              Delete entry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
