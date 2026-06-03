"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AddForm from "@/components/AddForm";
import ExcelImport from "@/components/ExcelImport";

type Item = { _id: string; code: string; name: string; active?: boolean };
type Branch = { _id: string; name: string; active?: boolean };

export default function ManagePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  async function refresh() {
    const [i, b] = await Promise.all([
      fetch("/api/items").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
    ]);
    setItems(i);
    setBranches(b);
  }

  useEffect(() => {
    refresh().catch(() => toast.error("Failed to load data."));
  }, []);

  async function toggleItem(id: string, active: boolean) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) return toast.error("Could not update item.");
    toast.success(active ? "Item reactivated." : "Item deactivated.");
    setItems((prev) => prev.map((x) => (x._id === id ? { ...x, active } : x)));
  }

  async function toggleBranch(id: string, active: boolean) {
    const res = await fetch(`/api/branches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) return toast.error("Could not update branch.");
    toast.success(active ? "Branch reactivated." : "Branch deactivated.");
    setBranches((prev) => prev.map((x) => (x._id === id ? { ...x, active } : x)));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6">
      <h1 className="text-2xl font-bold">Manage</h1>

      {/* ITEMS */}
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Items (Codes)</h2>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Add one</p>
          <AddForm type="items" onDone={refresh} />
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Import from Excel</p>
          <ExcelImport type="items" onDone={refresh} />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Code</th>
                <th className="p-2">Name</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const active = it.active !== false;
                return (
                  <tr key={it._id} className={`border-t ${active ? "" : "opacity-50"}`}>
                    <td className="p-2 font-medium">{it.code}</td>
                    <td className="p-2">{it.name}</td>
                    <td className="p-2">
                      <span className={active ? "text-green-600" : "text-red-600"}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => toggleItem(it._id, !active)}
                        className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                      >
                        {active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* BRANCHES */}
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Branches</h2>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Add one</p>
          <AddForm type="branches" onDone={refresh} />
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Import from Excel</p>
          <ExcelImport type="branches" onDone={refresh} />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Branch</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => {
                const active = b.active !== false;
                return (
                  <tr key={b._id} className={`border-t ${active ? "" : "opacity-50"}`}>
                    <td className="p-2 font-medium">{b.name}</td>
                    <td className="p-2">
                      <span className={active ? "text-green-600" : "text-red-600"}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => toggleBranch(b._id, !active)}
                        className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                      >
                        {active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    No branches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}