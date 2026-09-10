"use client";

import type { Slice } from "@/lib/aggregate";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/types";

export default function Breakdown({
  slices,
  currency,
  onSelect,
  selectedId,
}: {
  slices: Slice[];
  currency: Currency;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
}) {
  if (slices.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Nothing in this period.</p>;
  }
  const max = Math.max(...slices.map((s) => s.total), 1);

  return (
    <ul className="space-y-2.5">
      {slices.map((s) => {
        const selected = selectedId === s.id;
        const Row = onSelect ? "button" : "div";
        return (
          <li key={s.id}>
            <Row
              {...(onSelect
                ? {
                    type: "button" as const,
                    onClick: () => onSelect(selected ? null : s.id),
                    "aria-pressed": selected,
                  }
                : {})}
              className={`block w-full text-left ${
                onSelect ? "rounded-lg transition hover:opacity-80" : ""
              } ${selected ? "opacity-100" : ""}`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className={`truncate ${selected ? "font-semibold" : ""}`}>
                    {s.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {Math.round(s.share * 100)}%
                  </span>
                </span>
                <span className="tnum shrink-0 text-sm font-medium">
                  {formatMoney(s.total, currency)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((s.total / max) * 100, 2)}%`,
                    background: s.color,
                  }}
                />
              </div>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
