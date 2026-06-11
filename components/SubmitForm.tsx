"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { compressToWebp, putToR2 } from "@/lib/uploadPhoto";
type Branch = { _id: string; name: string; active?: boolean };
type Upload = { url: string; key: string };

export default function SubmitForm() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [code, setCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [lookupState, setLookupState] = useState<
    "" | "checking" | "found" | "notfound"
  >("");
  const [quantity, setQuantity] = useState("");
  const [branchId, setBranchId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data: Branch[]) =>
        setBranches(data.filter((b) => b.active !== false)),
      )
      .catch(() => toast.error("Could not load branches."));
  }, []);

  // revoke object URLs when previews change / component unmounts
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  async function lookupCode() {
    const c = code.trim();
    if (!c) {
      setItemName("");
      setLookupState("");
      return;
    }
    setLookupState("checking");
    try {
      const res = await fetch(
        `/api/items/lookup?code=${encodeURIComponent(c)}`,
      );
      const data = await res.json();
      if (data.found) {
        setItemName(data.name);
        setLookupState("found");
      } else {
        setItemName("");
        setLookupState("notfound");
        toast.error(`Code "${c}" not found.`);
      }
    } catch {
      setLookupState("");
      toast.error("Lookup failed.");
    }
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = ""; // allow re-picking same file
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---- validity gate for the Submit button ----
  const qtyNum = Number(quantity);
  const isValid = useMemo(
    () =>
      lookupState === "found" &&
      itemName.trim() !== "" &&
      Number.isFinite(qtyNum) &&
      qtyNum > 0 &&
      branchId !== "" &&
      files.length >= 1,
    [lookupState, itemName, qtyNum, branchId, files.length],
  );

  async function submit() {
    if (!isValid) return;
    setBusy(true);
    try {
      setProgress("Compressing photos…");
      const blobs = await Promise.all(files.map((f) => compressToWebp(f)));

      setProgress("Preparing upload…");
      const presignRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: blobs.length }),
      });
      const { uploads } = (await presignRes.json()) as { uploads: Upload[] };

      setProgress("Uploading…");
      await Promise.all(blobs.map((b, i) => putToR2(uploads[i].url, b)));

      setProgress("Saving…");
      const saveRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          quantity: qtyNum,
          branchId,
          photos: uploads.map((u) => ({ fullKey: u.key })),
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) {
        toast.error(saved.error ?? "Could not save submission.");
        return;
      }

      toast.success("Submission saved.");
      setCode("");
      setItemName("");
      setLookupState("");
      setQuantity("");
      setBranchId("");
      setFiles([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Something went wrong.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">New Submission</h1>

      {/* Code */}
      <div>
        <label className="block text-sm font-medium mb-1">كود الصنف</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onBlur={lookupCode}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Type code, then tab out"
        />
        {lookupState === "checking" && (
          <p className="mt-1 text-xs text-muted-foreground">Checking…</p>
        )}
        {lookupState === "notfound" && (
          <p className="mt-1 text-xs text-destructive">Code not found.</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Item name</label>
        <input
          value={itemName}
          readOnly
          className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
          placeholder="Auto-filled from code"
        />
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium mb-1">
          بالوحدة (قرص أو أمبول أو لبوسة)
        </label>
        <input
          type="number"
          step="any"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="e.g. 12 or 3.5"
        />
      </div>

      {/* Branch */}
      <div>
        <label className="block text-sm font-medium mb-1">الفرع</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select a branch…</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Photos + previews */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Photos (1 or more)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onPickFiles}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0
                     file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
        />
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`preview ${i + 1}`}
                  onClick={() => setLightbox(src)}
                  className="h-24 w-full cursor-pointer rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {files.length} photo(s) selected
          {files.length < 1 ? " — add at least 1" : ""}
        </p>
      </div>

      <button
        onClick={submit}
        disabled={busy || !isValid}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? progress || "Working…" : "Submit"}
      </button>

      {!isValid && !busy && (
        <p className="text-xs text-muted-foreground">
          Submit enables once code, quantity, branch, and 1+ photo are set.
        </p>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <img
            src={lightbox}
            alt="full preview"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
