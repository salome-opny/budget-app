"use client";

import { useRef, useState } from "react";
import { Button, Card } from "./ui";
import { buildBackup, restoreBackup, saveSettings } from "@/lib/mutations";
import { isoFrom } from "@/lib/dates";

type Status = { tone: "ok" | "error"; text: string } | null;

export default function BackupCard({ lastBackupAt }: { lastBackupAt: number | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    setStatus(null);
    try {
      const backup = await buildBackup();
      const json = JSON.stringify(backup, null, 2);
      const filename = `budget-backup-${isoFrom(new Date())}.json`;
      const file = new File([json], filename, { type: "application/json" });

      // On iOS the share sheet is the only reliable way to get a file out of a
      // standalone PWA; the anchor download is the desktop path.
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Budget backup" });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      await saveSettings({ lastBackupAt: Date.now() });
      setStatus({ tone: "ok", text: `Saved ${backup.txns.length} entries.` });
    } catch (err) {
      // A cancelled share sheet is not a failure worth shouting about.
      if (err instanceof DOMException && err.name === "AbortError") setStatus(null);
      else setStatus({ tone: "error", text: "Could not export. Try Copy instead." });
    } finally {
      setBusy(false);
    }
  }

  async function copyBackup() {
    try {
      const backup = await buildBackup();
      await navigator.clipboard.writeText(JSON.stringify(backup));
      await saveSettings({ lastBackupAt: Date.now() });
      setStatus({ tone: "ok", text: "Backup copied. Paste it somewhere safe." });
    } catch {
      setStatus({ tone: "error", text: "Clipboard blocked. Use Export instead." });
    }
  }

  async function importBackup(file: File) {
    const ok = confirm(
      "Restoring replaces everything currently in this app with the contents of the file. Continue?"
    );
    if (!ok) return;
    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        // Never surface a raw JSON.parse message; it means nothing to a reader.
        throw new Error("That file is not a Budget backup.");
      }
      const { txns } = await restoreBackup(parsed);
      setStatus({ tone: "ok", text: `Restored ${txns} entries.` });
    } catch (err) {
      setStatus({
        tone: "error",
        text:
          err instanceof Error ? err.message : "Could not read that file.",
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold">Backup</h2>
      <p className="mt-1 text-sm text-muted">
        Your data lives only on this device. If you clear Safari&apos;s storage or switch
        phones without a backup, it is gone. Export regularly.
      </p>
      <p className="mt-2 text-xs text-muted">
        {lastBackupAt
          ? `Last backup ${new Date(lastBackupAt).toLocaleDateString()}`
          : "You have never backed up."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={exportBackup} disabled={busy}>
          Export backup
        </Button>
        <Button variant="ghost" onClick={copyBackup} disabled={busy}>
          Copy as text
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          Restore from file
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importBackup(file);
        }}
      />

      {status ? (
        <p
          className={`mt-3 text-sm ${
            status.tone === "ok" ? "text-income" : "text-expense"
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </Card>
  );
}
