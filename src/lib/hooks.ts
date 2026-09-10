"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db, { DEFAULT_SETTINGS } from "./db";
import type { Category, Group, Kind, Settings, Txn } from "./types";

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get("settings"), []);
  return s ?? DEFAULT_SETTINGS;
}

export function useGroups(kind?: Kind): Group[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.groups.toArray();
    return all
      .filter((g) => !kind || g.kind === kind)
      .sort((a, b) => a.order - b.order);
  }, [kind]);
}

export function useCategories(kind?: Kind): Category[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.categories.toArray();
    return all
      .filter((c) => !kind || c.kind === kind)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [kind]);
}

/** All transactions, newest first. The dataset is personal-scale, so this stays cheap. */
export function useTxns(): Txn[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.txns.toArray();
    return all.sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
    );
  }, []);
}

export function useNameMap(items: Array<{ id: string; name: string }> | undefined) {
  const map = new Map<string, string>();
  for (const i of items ?? []) map.set(i.id, i.name);
  return map;
}
