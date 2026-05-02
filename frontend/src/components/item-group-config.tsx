"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { ItemGroup } from "@/lib/item-groups";

type GroupableItem = {
  id: string;
  item_code?: string;
  description?: string;
  short_description?: string;
};

type Props = {
  open: boolean;
  department: string;
  items: GroupableItem[];
  groups: ItemGroup[];
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onCreateGroup: () => Promise<void>;
  onUpdateGroup: (groupId: string, updates: Partial<ItemGroup>) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onGroupsChange: (groups: ItemGroup[]) => void;
};

export default function ItemGroupConfig({
  open,
  department,
  items,
  groups,
  loading,
  error,
  onClose,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onGroupsChange,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState("");

  if (!open) return null;

  const setupError = (localError || error)?.includes("item_groups")
    ? "Item groups table is not set up in Supabase yet. Apply the item_groups SQL migration, then reopen this panel."
    : localError || error;

  const run = async (action: () => Promise<void>, busyKey?: string) => {
    setLocalError("");
    if (busyKey) setBusyId(busyKey);
    try {
      await action();
    } catch (err: any) {
      setLocalError(err.message || "Group action failed");
    } finally {
      if (busyKey) setBusyId(null);
    }
  };

  const createGroup = async () => {
    setCreating(true);
    await run(onCreateGroup);
    setCreating(false);
  };

  const patchLocalGroup = (group: ItemGroup) => {
    onGroupsChange(groups.map((entry) => (entry.id === group.id ? group : entry)));
  };

  const toggleItem = (group: ItemGroup, itemId: string) => {
    const selected = group.selected_item_ids.includes(itemId);
    const selectedItemIds = selected
      ? group.selected_item_ids.filter((id) => id !== itemId)
      : [...group.selected_item_ids, itemId];
    void run(() => onUpdateGroup(group.id, { selected_item_ids: selectedItemIds }), group.id);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/55">
      <button
        type="button"
        aria-label="Close item groups"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="relative flex items-start justify-between border-b border-slate-200 bg-white px-7 py-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Item Groups</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{department || "Department"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <button
            onClick={() => void createGroup()}
            disabled={creating || loading}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-blue-300 px-4 py-3 text-sm font-black text-blue-600 transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:hover:bg-blue-950/30"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Group
          </button>

          {setupError && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-950/30">
              {setupError}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Loading groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              No groups yet.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="pl-4 pt-4">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={group.is_active}
                          onChange={(event) => void run(() => onUpdateGroup(group.id, { is_active: event.target.checked }), group.id)}
                          className="peer sr-only"
                        />
                        <span className="h-7 w-12 rounded-full bg-slate-300 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:bg-blue-600 peer-checked:after:translate-x-5" />
                      </label>
                    </div>
                    <input
                      value={group.name}
                      onChange={(event) => patchLocalGroup({ ...group, name: event.target.value })}
                      onBlur={(event) => void run(() => onUpdateGroup(group.id, { name: event.target.value }), group.id)}
                      className="mt-4 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    {group.is_active && (
                      <span className="mt-4 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-600 dark:border-blue-900 dark:bg-blue-950/40">
                        Active
                      </span>
                    )}
                    <button
                      onClick={() => void run(() => onDeleteGroup(group.id), group.id)}
                      disabled={busyId === group.id}
                      className="mr-3 mt-4 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:hover:bg-red-950/30"
                    >
                      {busyId === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="border-t border-slate-200 px-4 pb-4 pt-3 dark:border-slate-800">
                    <p className="mb-3 text-xs font-black text-slate-500">Select items for this group</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={group.selected_item_ids.includes(item.id)}
                          onChange={() => toggleItem(group, item.id)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block">{item.short_description || item.item_code || item.description || "Item"}</span>
                          {item.item_code && <span className="block text-[10px] text-slate-400">{item.item_code}</span>}
                        </span>
                      </label>
                    ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
