"use client";

import { useState } from "react";
import { toast } from "sonner";
import { parseItems, parseBranches, type ItemRow, type BranchRow } from "@/lib/excel";

type Props = { type: "items" | "branches"; onDone?: () => void };

export default function ExcelImport({ type, onDone }: Props) {
  const [errors, setErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<(ItemRow | BranchRow)[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setRows([]);
    setBusy(true);

    try {
      const buf = await file.arrayBuffer();

      // fetch existing keys for the nice client-side preview check
      const checkRes = await fetch(`/api/${type}`);
      const existing = await checkRes.json();

      let result;
      if (type === "items") {
        const codes = new Set<string>(existing.map((x: any) => String(x.code)));
        result = parseItems(buf, codes);
      } else {
        const names = new Set<string>(
          existing.map((x: any) => String(x.name).toLowerCase())
        );
        result = parseBranches(buf, names);
      }

      if (!result.ok) {
        setErrors(result.errors);
        toast.error(
          `Import blocked — ${result.errors.length} problem${
            result.errors.length > 1 ? "s" : ""
          } found.`
        );
      } else {
        setRows(result.rows);
        toast.success(`${result.rows.length} ${type} ready to import.`);
      }
    } catch (err: any) {
      toast.error("Could not read the file. Is it a valid Excel sheet?");
      setErrors([String(err?.message ?? err)]);
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-selecting same file
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const res = await fetch(`/api/${type}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();

      if (!res.ok) {
        // server rejected (e.g. race) — show its details in the panel
        setErrors(data.details ?? [data.error ?? "Import failed."]);
        toast.error(data.error ?? "Import failed.");
        setRows([]);
        return;
      }

      toast.success(`Imported ${data.inserted} ${type} successfully.`);
      setRows([]);
      setFileName("");
      onDone?.();
    } catch {
      toast.error("Network error during import.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Upload {type} Excel (.xlsx)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          disabled={busy}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0
                     file:bg-primary file:px-4 file:py-2 file:text-primary-foreground
                     hover:file:opacity-90 cursor-pointer"
        />
        {fileName && (
          <p className="mt-1 text-xs text-muted-foreground">Selected: {fileName}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {type === "items"
            ? 'Header row required: "code" and "name".'
            : 'Header row required: "branch".'}
        </p>
      </div>

      {/* ERROR PANEL — persists so user can read every row to fix */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="mb-2 text-sm font-semibold text-destructive">
            Import blocked — fix the file and upload again:
          </p>
          <ul className="max-h-60 space-y-1 overflow-auto text-sm text-destructive">
            {errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* PREVIEW — only when clean */}
      {rows.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-semibold text-green-600">
            ✓ {rows.length} {type} ready — no problems found.
          </p>
          <div className="max-h-60 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {type === "items" ? (
                    <>
                      <th className="py-1 pr-4">Code</th>
                      <th className="py-1">Name</th>
                    </>
                  ) : (
                    <th className="py-1">Branch</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {type === "items" ? (
                      <>
                        <td className="py-1 pr-4">{(r as ItemRow).code}</td>
                        <td className="py-1">{(r as ItemRow).name}</td>
                      </>
                    ) : (
                      <td className="py-1">{(r as BranchRow).name}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleImport}
            disabled={busy}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm
                       text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Importing..." : `Import ${rows.length} ${type}`}
          </button>
        </div>
      )}
    </div>
  );
}