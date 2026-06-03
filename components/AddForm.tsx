"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = { type: "items" | "branches"; onDone?: () => void };

export default function AddForm({ type, onDone }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const body =
        type === "items" ? { code: code.trim(), name: name.trim() } : { name: name.trim() };

      const res = await fetch(`/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Could not add.");
        return;
      }

      toast.success(
        type === "items" ? `Item "${data.code}" added.` : `Branch "${data.name}" added.`
      );
      setCode("");
      setName("");
      onDone?.();
    } catch {
      toast.error("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {type === "items" && (
        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="e.g. A100"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">
          {type === "items" ? "Name" : "Branch name"}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
          placeholder={type === "items" ? "Item name" : "Branch name"}
        />
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Adding..." : "Add"}
      </button>
    </div>
  );
}