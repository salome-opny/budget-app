import assert from "node:assert/strict";
import { test } from "vitest";
import {
  budgetStatuses,
  byCategory,
  filterTxns,
  monthlyTotals,
  monthsWithData,
  NEAR_LIMIT_RATIO,
  sumPrimary,
} from "./aggregate";
import {
  daysLeftInMonth,
  inRange,
  lastMonths,
  monthKey,
  monthLabel,
  monthProgress,
  shiftMonth,
} from "./dates";
import type { Category, Group, Txn } from "./types";

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

const group = (over: Partial<Group>): Group => ({
  id: "g1",
  name: "Personal",
  kind: "expense",
  order: 0,
  color: "#000",
  ...over,
});

test("budgetStatuses ignores groups without a ceiling", () => {
  const groups = [
    group({ id: "a", limitAmount: 1000, budgetCurrency: "USD" }),
    group({ id: "b" }),
    group({ id: "c", limitAmount: null }),
    group({ id: "d", limitAmount: 0, budgetCurrency: "USD" }),
  ];
  const got = budgetStatuses([], settings, groups, "2026-08");
  assert.deepEqual(got.map((s) => s.groupId), ["a"]);
});

test("budgetStatuses only counts that group's expenses in that month", () => {
  const groups = [group({ id: "a", limitAmount: 1000, budgetCurrency: "USD" })];
  const rows = [
    txn({ groupId: "a", date: "2026-08-05", amount: 300 }),
    // Other group, other month, and income all have to be excluded.
    txn({ groupId: "b", date: "2026-08-06", amount: 500 }),
    txn({ groupId: "a", date: "2026-07-31", amount: 500 }),
    txn({ groupId: "a", date: "2026-09-01", amount: 500 }),
    txn({ groupId: "a", date: "2026-08-20", amount: 900, kind: "income" }),
  ];
  const [s] = budgetStatuses(rows, settings, groups, "2026-08");
  assert.equal(s.spent, 300);
  assert.equal(s.remaining, 700);
});

test("budgetStatuses converts a ceiling set in pesos", () => {
  const groups = [group({ id: "a", limitAmount: 4000000, budgetCurrency: "COP" })];
  // 4,000,000 COP at 4000 per dollar is a $1,000 ceiling.
  const [s] = budgetStatuses([txn({ groupId: "a", amount: 250 })], settings, groups, "2026-08");
  assert.equal(s.limit, 1000);
  assert.equal(s.ratio, 0.25);
  assert.equal(s.state, "under");
});

test("budgetStatuses reports under, near and over", () => {
  const mk = (spent: number) =>
    budgetStatuses(
      [txn({ groupId: "a", amount: spent })],
      settings,
      [group({ id: "a", limitAmount: 100, budgetCurrency: "USD" })],
      "2026-08"
    )[0];
  assert.equal(mk(50).state, "under");
  assert.equal(mk(NEAR_LIMIT_RATIO * 100).state, "near");
  assert.equal(mk(100).state, "near");
  // Exactly at the ceiling is not yet over; a cent past it is.
  assert.equal(mk(100.01).state, "over");
  assert.equal(mk(150).state, "over");
  assert.equal(mk(150).remaining, -50);
});

test("budgetStatuses puts the most strained group first", () => {
  const groups = [
    group({ id: "calm", limitAmount: 1000, budgetCurrency: "USD" }),
    group({ id: "blown", limitAmount: 100, budgetCurrency: "USD" }),
  ];
  const rows = [
    txn({ groupId: "calm", amount: 100 }),
    txn({ groupId: "blown", amount: 150 }),
  ];
  assert.deepEqual(
    budgetStatuses(rows, settings, groups, "2026-08").map((s) => s.groupId),
    ["blown", "calm"]
  );
});

test("monthProgress is 0 before, a fraction during, and 1 after", () => {
  assert.equal(monthProgress("2026-08", "2026-07-15"), 0);
  assert.equal(monthProgress("2026-08", "2026-09-01"), 1);
  // August has 31 days.
  assert.equal(monthProgress("2026-08", "2026-08-31"), 1);
  assert.equal(monthProgress("2026-08", "2026-08-01"), 1 / 31);
});

test("daysLeftInMonth counts today as still available", () => {
  assert.equal(daysLeftInMonth("2026-08", "2026-08-31"), 1);
  assert.equal(daysLeftInMonth("2026-08", "2026-08-01"), 31);
  assert.equal(daysLeftInMonth("2026-08", "2026-09-05"), 0);
});

test("budgetStatuses tracks a goal on its own, and never calls it over", () => {
  const groups = [group({ id: "a", goalAmount: 500, budgetCurrency: "USD" })];
  const at = (spent: number) =>
    budgetStatuses([txn({ groupId: "a", amount: spent })], settings, groups, "2026-08")[0];
  assert.equal(at(400).state, "under");
  assert.equal(at(400).toGoal, 100);
  assert.equal(at(400).limit, null);
  assert.equal(at(400).scale, 500);
  // A goal is aspirational: blowing it warns, it does not go red.
  assert.equal(at(900).state, "past-goal");
  assert.equal(at(900).toGoal, -400);
});

test("budgetStatuses warns past the goal even while far under the ceiling", () => {
  const groups = [group({ id: "a", limitAmount: 1000, goalAmount: 400, budgetCurrency: "USD" })];
  const [s] = budgetStatuses([txn({ groupId: "a", amount: 500 })], settings, groups, "2026-08");
  assert.equal(s.state, "past-goal");
  assert.equal(s.scale, 1000);
  assert.equal(s.remaining, 500);
  assert.equal(s.toGoal, -100);
});

test("budgetStatuses lets the ceiling outrank the goal when both are in trouble", () => {
  const groups = [group({ id: "a", limitAmount: 1000, goalAmount: 400, budgetCurrency: "USD" })];
  const at = (spent: number) =>
    budgetStatuses([txn({ groupId: "a", amount: spent })], settings, groups, "2026-08")[0].state;
  assert.equal(at(300), "under");
  assert.equal(at(850), "near");
  assert.equal(at(1200), "over");
});

test("budgetStatuses converts limit and goal with the group's one currency", () => {
  const groups = [
    group({ id: "a", limitAmount: 4000000, goalAmount: 2000000, budgetCurrency: "COP" }),
  ];
  const [s] = budgetStatuses([], settings, groups, "2026-08");
  assert.equal(s.limit, 1000);
  assert.equal(s.goal, 500);
});

test("budgetStatuses reads a group with no stored currency in the main currency", () => {
  const cop = { primaryCurrency: "COP" as const, copPerUsd: 4000 };
  const [s] = budgetStatuses([], cop, [group({ id: "a", limitAmount: 2000000 })], "2026-08");
  assert.equal(s.limit, 2000000);
});
