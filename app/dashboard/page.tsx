"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import R2Image from "@/components/R2Image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Branch = { _id: string; name: string };
type Submission = {
  _id: string;
  code: string;
  itemName: string;
  quantity: number;
  branchName: string;
  photos: { fullKey: string }[];
  createdAt: string;
  status?: "not_sent" | "sent";
  statusUpdatedAt?: string;
};

const dateFmt: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

// make a filesystem-safe filename piece
function safe(s: string) {
  return String(s).replace(/[^\w\u0600-\u06FF-]+/g, "_").replace(/_+/g, "_");
}

export default function Dashboard() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  // filters
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // status-change confirm dialog
  const [confirmFor, setConfirmFor] = useState<{ id: string; next: "sent" | "not_sent" } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d))
      .catch(() => toast.error("Could not load branches."));
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search() {
    setBusy(true);
    setSelected(new Set()); // clear selection on new search
    try {
      const p = new URLSearchParams();
      if (code.trim()) p.set("code", code.trim());
      if (name.trim()) p.set("name", name.trim());
      if (branchId) p.set("branchId", branchId);
      if (status) p.set("status", status);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      p.set("limit", "50");

      const res = await fetch(`/api/submissions?${p.toString()}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);

      const keys = (data.rows ?? []).flatMap((r: Submission) =>
        r.photos.map((ph) => ph.fullKey)
      );
      if (keys.length) {
        const vr = await fetch("/api/view-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        });
        const { urls } = await vr.json();
        setUrls(urls);
      } else {
        setUrls({});
      }
    } catch {
      toast.error("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setCode("");
    setName("");
    setBranchId("");
    setStatus("");
    setFrom("");
    setTo("");
  }

  // ---- selection helpers ----
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allShownSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));

  function toggleSelectAll() {
    setSelected((prev) => {
      if (rows.every((r) => prev.has(r._id))) {
        // deselect all shown
        const next = new Set(prev);
        rows.forEach((r) => next.delete(r._id));
        return next;
      }
      // select all shown
      const next = new Set(prev);
      rows.forEach((r) => next.add(r._id));
      return next;
    });
  }

  // ---- zip download ----
  async function downloadZip() {
    const chosen = rows.filter((r) => selected.has(r._id));
    if (chosen.length === 0) return toast.error("Select at least one ticket.");

    setZipping(true);
    try {
      const zip = new JSZip();

      for (const s of chosen) {
        for (let i = 0; i < s.photos.length; i++) {
          const url = urls[s.photos[i].fullKey];
          if (!url) continue;
          const blob = await fetch(
            `/api/download?key=${encodeURIComponent(s.photos[i].fullKey)}`
          ).then((r) => r.blob());
          const fname = `${safe(s.code)}_${safe(s.branchName)}_${i + 1}.webp`;
          zip.file(fname, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      const dlUrl = URL.createObjectURL(content);
      a.href = dlUrl;
      a.download = `tickets_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);

      toast.success(`Downloaded ${chosen.length} ticket(s).`);
    } catch {
      toast.error("Could not build the zip. Try Search again (links may have expired).");
    } finally {
      setZipping(false);
    }
  }


  function onFilterKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !busy) search();
  }
  async function applyStatusChange() {
    if (!confirmFor) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${confirmFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: confirmFor.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update status.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r._id === confirmFor.id
            ? { ...r, status: data.status, statusUpdatedAt: data.statusUpdatedAt }
            : r
        )
      );
      toast.success(`Marked as ${confirmFor.next === "sent" ? "Sent" : "Not sent"}.`);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
      setConfirmFor(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Submissions</h1>

      {/* FILTERS */}
      <div 
      onKeyDown={onFilterKeyDown}

      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-7">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="not_sent">Not sent</option>
          <option value="sent">Sent</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={search}
            disabled={busy}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Searching…" : "Search"}
          </button>
          <button
            onClick={clearFilters}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>

      {/* RESULT BAR + DOWNLOAD */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} result(s){selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </p>
        <button
          onClick={downloadZip}
          disabled={zipping || selected.size === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {zipping ? "Preparing…" : `Download selected (${selected.size})`}
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  onChange={toggleSelectAll}
                  title="Select all on this page"
                />
              </th>
              <th className="p-3">Code</th>
              <th className="p-3">Item</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Status</th>
              <th className="p-3">Photos</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const current = s.status === "sent" ? "sent" : "not_sent";
              const next = current === "sent" ? "not_sent" : "sent";
              return (
                <tr key={s._id} className="border-t align-top">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(s._id)}
                      onChange={() => toggleRow(s._id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{s.code}</td>
                  <td className="p-3">{s.itemName}</td>
                  <td className="p-3">{s.quantity}</td>
                  <td className="p-3">{s.branchName}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setConfirmFor({ id: s._id, next })}
                      className={`font-semibold underline-offset-2 hover:underline ${
                        current === "sent" ? "text-green-600" : "text-red-600"
                      }`}
                      title="Click to change"
                    >
                      {current === "sent" ? "Sent" : "Not sent"}
                    </button>
                    {s.statusUpdatedAt && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(s.statusUpdatedAt).toLocaleString("en-GB", dateFmt)}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {s.photos.map((ph, i) => (
                        <R2Image
                          key={i}
                          url={urls[ph.fullKey]}
                          alt={`${s.code} photo ${i + 1}`}
                          onClick={() => setLightbox(urls[ph.fullKey] ?? null)}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString("en-GB", dateFmt)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !busy && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No submissions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <img
            src={lightbox}
            alt="full"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      {/* STATUS CONFIRM DIALOG */}
      <Dialog open={!!confirmFor} onOpenChange={(o) => !o && setConfirmFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Mark this submission as{" "}
              <span
                className={
                  confirmFor?.next === "sent"
                    ? "font-semibold text-green-600"
                    : "font-semibold text-red-600"
                }
              >
                {confirmFor?.next === "sent" ? "Sent" : "Not sent"}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmFor(null)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={applyStatusChange}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}