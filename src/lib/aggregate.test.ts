import assert from "node:assert/strict";
import { test } from "vitest";
import { byCategory, filterTxns, monthlyTotals, monthsWithData, sumPrimary } from "./aggregate";
import { inRange, lastMonths, monthKey, monthLabel, shiftMonth } from "./dates";
import type { Category, Txn } from "./types";

const settings = { primaryCurrency: "USD" as const, copPerUsd: 4000 };

const cats: Category[] = [
  { id: "rent", name: "Housing", kind: "expense", order: 0, color: "#000" },
  { id: "food", name: "Food", kind: "expense", order: 1, color: "#111" },
];

let seq = 0;
const txn = (over: Partial<Txn>): Txn => ({
  id: `t${seq}`,
  date: "2026-08-10",
  amount: 100,
  currency: "USD",
  kind: "expense",
  groupId: "g1",
  categoryId: "rent",
  note: "",
  createdAt: seq++,
  ...over,
});

test("shiftMonth crosses year boundaries in both directions", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-09", -12), "2025-09");
});

test("lastMonths returns a contiguous run ending at the given month", () => {
  assert.deepEqual(lastMonths("2026-03", 4), ["2025-12", "2026-01", "2026-02", "2026-03"]);
});

test("monthKey and monthLabel agree", () => {
  assert.equal(monthKey("2026-09-30"), "2026-09");
  assert.equal(monthLabel("2026-09"), "September 2026");
});

test("inRange is inclusive at both ends", () => {
  assert.equal(inRange("2026-08-01", "2026-08-01", "2026-08-31"), true);
  assert.equal(inRange("2026-08-31", "2026-08-01", "2026-08-31"), true);
  assert.equal(inRange("2026-07-31", "2026-08-01", "2026-08-31"), false);
  assert.equal(inRange("2026-09-01", "2026-08-01", "2026-08-31"), false);
  // An open range accepts anything.
  assert.equal(inRange("1999-01-01", null, null), true);
});

test("filterTxns narrows by kind, group and date at once", () => {
  const rows = [
    txn({ date: "2026-08-05", kind: "expense", groupId: "personal" }),
    txn({ date: "2026-08-06", kind: "income", groupId: "personal" }),
    txn({ date: "2026-08-07", kind: "expense", groupId: "business" }),
    txn({ date: "2026-09-01", kind: "expense", groupId: "personal" }),
  ];
  const got = filterTxns(rows, {
    from: "2026-08-01",
    to: "2026-08-31",
    kind: "expense",
    groupId: "personal",
  });
  assert.equal(got.length, 1);
  assert.equal(got[0].date, "2026-08-05");
});

test("sumPrimary converts pesos before adding them to dollars", () => {
  const rows = [
    txn({ amount: 100, currency: "USD" }),
    txn({ amount: 400000, currency: "COP" }),
  ];
  assert.equal(sumPrimary(rows, settings), 200);
});

test("byCategory ranks by converted total and shares add up to 1", () => {
  const rows = [
    txn({ categoryId: "rent", amount: 1000, currency: "USD" }),
    txn({ categoryId: "food", amount: 1200000, currency: "COP" }),
  ];
  const slices = byCategory(rows, settings, cats);
  assert.deepEqual(slices.map((s) => s.name), ["Housing", "Food"]);
  assert.equal(slices[0].total, 1000);
  assert.equal(slices[1].total, 300);
  assert.equal(Math.round(slices.reduce((a, s) => a + s.share, 0)), 1);
});

test("byCategory labels a category that no longer exists", () => {
  const slices = byCategory([txn({ categoryId: "ghost" })], settings, cats);
  assert.equal(slices[0].name, "Deleted");
});

test("monthlyTotals fills empty months with zeros and nets correctly", () => {
  const rows = [
    txn({ date: "2026-08-03", kind: "income", amount: 5000 }),
    txn({ date: "2026-08-20", kind: "expense", amount: 2000 }),
    txn({ date: "2026-09-02", kind: "expense", amount: 400000, currency: "COP" }),
  ];
  const got = monthlyTotals(rows, settings, ["2026-07", "2026-08", "2026-09"]);
  assert.deepEqual(got, [
    { month: "2026-07", income: 0, expense: 0, net: 0 },
    { month: "2026-08", income: 5000, expense: 2000, net: 3000 },
    { month: "2026-09", income: 0, expense: 100, net: -100 },
  ]);
});

test("monthlyTotals ignores entries outside the requested months", () => {
  const rows = [txn({ date: "2020-01-01", kind: "expense", amount: 999 })];
  const got = monthlyTotals(rows, settings, ["2026-08"]);
  assert.equal(got[0].expense, 0);
});

test("monthsWithData is sorted and deduplicated", () => {
  const rows = [
    txn({ date: "2026-09-01" }),
    txn({ date: "2026-07-15" }),
    txn({ date: "2026-09-20" }),
  ];
  assert.deepEqual(monthsWithData(rows), ["2026-07", "2026-09"]);
});
