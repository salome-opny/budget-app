"use client";

import { useEffect } from "react";

import { withBase } from "@/lib/basePath";

/** Registers the offline cache. Failures are non-fatal: the app works online regardless. */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register(withBase("/sw.js")).catch(() => {});
  }, []);
  return null;
}
