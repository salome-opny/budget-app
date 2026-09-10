"use client";

import Dexie, { type EntityTable } from "dexie";
import type { Category, Group, Settings, Txn } from "./types";

export const PALETTE = [
  "#2f8f6b",
  "#c2683a",
  "#4a6fa5",
  "#9a6ea8",
  "#b3893c",
  "#4f8fa8",
  "#a1526b",
  "#6b7f4a",
];

const db = new Dexie("budget") as Dexie & {
  groups: EntityTable<Group, "id">;
  categories: EntityTable<Category, "id">;
  txns: EntityTable<Txn, "id">;
  settings: EntityTable<Settings, "id">;
};

const SCHEMA = {
  groups: "id, kind, order",
  categories: "id, kind, order",
  txns: "id, date, kind, groupId, categoryId",
  settings: "id",
};

db.version(1).stores(SCHEMA);

// v2 changes no indexes. It moves an install that was seeded with USD over to
// COP, now that pesos are the default. Entries keep their own currency, so this
// only changes how totals are displayed, and the toggle in Settings reverses it.
db.version(2)
  .stores(SCHEMA)
  .upgrade((tx) =>
    tx
      .table("settings")
      .toCollection()
      .modify((s: Settings) => {
        s.primaryCurrency = "COP";
      })
  );

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const seedGroups: Array<[string, Group["kind"]]> = [
  ["Personal", "expense"],
  ["Business", "expense"],
  ["General", "income"],
];

const seedCategories: Array<[string, Category["kind"]]> = [
  ["Housing", "expense"],
  ["Food & Groceries", "expense"],
  ["Transport", "expense"],
  ["Health", "expense"],
  ["Subscriptions", "expense"],
  ["Shopping", "expense"],
  ["Travel", "expense"],
  ["Taxes & Fees", "expense"],
  ["Other", "expense"],
  ["Salary", "income"],
  ["Consulting", "income"],
  ["Product Sales", "income"],
  ["Refunds", "income"],
  ["Other", "income"],
];

export const DEFAULT_SETTINGS: Settings = {
  id: "settings",
  primaryCurrency: "COP",
  copPerUsd: 4000,
  lastBackupAt: null,
};

db.on("populate", async () => {
  await db.groups.bulkAdd(
    seedGroups.map(([name, kind], i) => ({
      id: newId(),
      name,
      kind,
      order: i,
      color: PALETTE[i % PALETTE.length],
    }))
  );
  await db.categories.bulkAdd(
    seedCategories.map(([name, kind], i) => ({
      id: newId(),
      name,
      kind,
      order: i,
      color: PALETTE[i % PALETTE.length],
    }))
  );
  await db.settings.add({ ...DEFAULT_SETTINGS });
});

export default db;
