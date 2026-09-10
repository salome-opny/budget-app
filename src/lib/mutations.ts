"use client";

import db, { newId, PALETTE } from "./db";
import type { Category, Currency, Group, Kind, Txn } from "./types";

export async function addTxn(input: {
  date: string;
  amount: number;
  currency: Currency;
  kind: Kind;
  groupId: string;
  categoryId: string;
  note: string;
}): Promise<string> {
  const id = newId();
  await db.txns.add({ ...input, id, createdAt: Date.now() });
  return id;
}

export async function updateTxn(id: string, patch: Partial<Txn>): Promise<void> {
  await db.txns.update(id, patch);
}

export async function deleteTxn(id: string): Promise<void> {
  await db.txns.delete(id);
}

export async function addGroup(name: string, kind: Kind): Promise<string> {
  const count = await db.groups.count();
  const id = newId();
  await db.groups.add({
    id,
    name,
    kind,
    order: count,
    color: PALETTE[count % PALETTE.length],
  });
  return id;
}

export async function renameGroup(id: string, name: string): Promise<void> {
  await db.groups.update(id, { name });
}

/**
 * Deleting a group would orphan its transactions, so callers must say where
 * those go. Passing `null` deletes them along with the group.
 */
export async function deleteGroup(id: string, moveTo: string | null): Promise<void> {
  await db.transaction("rw", db.groups, db.txns, async () => {
    if (moveTo) {
      await db.txns.where("groupId").equals(id).modify({ groupId: moveTo });
    } else {
      await db.txns.where("groupId").equals(id).delete();
    }
    await db.groups.delete(id);
  });
}

export async function addCategory(name: string, kind: Kind): Promise<string> {
  const count = await db.categories.count();
  const id = newId();
  await db.categories.add({
    id,
    name,
    kind,
    order: count,
    color: PALETTE[count % PALETTE.length],
  });
  return id;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await db.categories.update(id, { name });
}

export async function deleteCategory(id: string, moveTo: string | null): Promise<void> {
  await db.transaction("rw", db.categories, db.txns, async () => {
    if (moveTo) {
      await db.txns.where("categoryId").equals(id).modify({ categoryId: moveTo });
    } else {
      await db.txns.where("categoryId").equals(id).delete();
    }
    await db.categories.delete(id);
  });
}

export async function saveSettings(patch: {
  primaryCurrency?: Currency;
  copPerUsd?: number;
  lastBackupAt?: number | null;
}): Promise<void> {
  await db.settings.update("settings", patch);
}

export interface Backup {
  format: "budget-app-backup";
  version: 1;
  exportedAt: string;
  groups: Group[];
  categories: Category[];
  txns: Txn[];
  settings: { primaryCurrency: Currency; copPerUsd: number };
}

export async function buildBackup(): Promise<Backup> {
  const [groups, categories, txns, settings] = await Promise.all([
    db.groups.toArray(),
    db.categories.toArray(),
    db.txns.toArray(),
    db.settings.get("settings"),
  ]);
  return {
    format: "budget-app-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    groups,
    categories,
    txns,
    settings: {
      primaryCurrency: settings?.primaryCurrency ?? "USD",
      copPerUsd: settings?.copPerUsd ?? 4000,
    },
  };
}

/** Replaces everything currently stored. Callers must confirm with the user first. */
export async function restoreBackup(raw: unknown): Promise<{ txns: number }> {
  const data = raw as Partial<Backup>;
  if (!data || data.format !== "budget-app-backup" || !Array.isArray(data.txns)) {
    throw new Error("That file is not a Budget backup.");
  }
  await db.transaction("rw", db.groups, db.categories, db.txns, db.settings, async () => {
    await Promise.all([db.groups.clear(), db.categories.clear(), db.txns.clear()]);
    await db.groups.bulkAdd(data.groups ?? []);
    await db.categories.bulkAdd(data.categories ?? []);
    await db.txns.bulkAdd(data.txns ?? []);
    await db.settings.put({
      id: "settings",
      primaryCurrency: data.settings?.primaryCurrency ?? "USD",
      copPerUsd: data.settings?.copPerUsd ?? 4000,
      lastBackupAt: Date.now(),
    });
  });
  return { txns: (data.txns ?? []).length };
}
