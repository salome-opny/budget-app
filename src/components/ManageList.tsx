"use client";

import { useState, type ReactNode } from "react";
import { Button, inputClass } from "./ui";

export interface ManageItem {
  id: string;
  name: string;
  color: string;
}

export default function ManageList({
  items,
  usage,
  noun,
  onRename,
  onAdd,
  onDelete,
  renderDetail,
}: {
  items: ManageItem[];
  /** How many entries reference each item, so deletion can warn honestly. */
  usage: Map<string, number>;
  noun: string;
  onRename: (id: string, name: string) => Promise<void>;
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string, moveTo: string | null) => Promise<void>;
  /** Extra controls under each row, e.g. the spending ceiling on expense groups. */
  renderDetail?: (item: ManageItem) => ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  async function add() {
    const name = draft.trim();
    if (!name) return;
    await onAdd(name);
    setDraft("");
  }

  function startDelete(id: string) {
    const other = items.find((i) => i.id !== id);
    setMoveTo(other?.id ?? "");
    setConfirming(id);
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {items.map((item) => {
          const count = usage.get(item.id) ?? 0;
          const isConfirming = confirming === item.id;
          const others = items.filter((i) => i.id !== item.id);
          return (
            <li key={item.id} className="bg-surface">
              <div className="flex items-center gap-2 px-3 py-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <input
                  defaultValue={item.name}
                  aria-label={`${noun} name`}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== item.name) void onRename(item.id, next);
                    else e.target.value = item.name;
                  }}
                  className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
                />
                <span className="shrink-0 text-xs text-muted">{count}</span>
                <button
                  type="button"
                  onClick={() => (isConfirming ? setConfirming(null) : startDelete(item.id))}
                  aria-label={`Delete ${item.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-muted hover:text-expense"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  >
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>

              {renderDetail ? (
                <div className="border-t border-border px-3 py-2.5">
                  {renderDetail(item)}
                </div>
              ) : null}

              {isConfirming ? (
                <div className="border-t border-border bg-surface-2 px-3 py-3">
                  {count > 0 ? (
                    <>
                      <p className="mb-2 text-xs text-muted">
                        {count} {count === 1 ? "entry uses" : "entries use"} this {noun}.
                        Where should {count === 1 ? "it" : "they"} go?
                      </p>
                      <select
                        value={moveTo}
                        onChange={(e) => setMoveTo(e.target.value)}
                        className={`${inputClass} mb-2 text-sm`}
                      >
                        {others.map((o) => (
                          <option key={o.id} value={o.id}>
                            Move to {o.name}
                          </option>
                        ))}
                        <option value="">Delete those entries too</option>
                      </select>
                    </>
                  ) : (
                    <p className="mb-2 text-xs text-muted">
                      Nothing uses this {noun}. Safe to remove.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      onClick={async () => {
                        await onDelete(item.id, moveTo || null);
                        setConfirming(null);
                      }}
                      className="flex-1"
                    >
                      Delete {noun}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder={`New ${noun}`}
          className={`${inputClass} text-sm`}
        />
        <Button variant="ghost" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
