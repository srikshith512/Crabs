export type ItemGroup = {
  id: string;
  order_id: string;
  department: string;
  name: string;
  is_active: boolean;
  selected_item_ids: string[];
  created_at?: string;
  updated_at?: string;
};

export type GroupMilestone = {
  itemId: string;
  mapKey: string;
};

export type RALock = {
  milestoneKey?: string;
  qty?: number;
};

export function normalizeDepartment(department?: string | null) {
  return (department || "").trim().toLowerCase();
}

export function getBlockedGroupReason(
  milestone: GroupMilestone,
  milestoneValues: Record<string, number | string | undefined> | undefined,
  groups: ItemGroup[],
  locks: RALock[] = [],
) {
  const activeGroups = groups.filter(
    (group) => group.is_active && group.selected_item_ids.includes(milestone.itemId),
  );

  for (const group of activeGroups) {
    const blockedByItemId = group.selected_item_ids.find((groupedItemId) => {
      if (groupedItemId === milestone.itemId) return false;

      const hasEnteredValue = Object.entries(milestoneValues || {}).some(([key, value]) => {
        if (!key.startsWith(`item_${groupedItemId}_ms_`)) return false;
        return Number(value || 0) > 0;
      });
      if (hasEnteredValue) return true;

      return locks.some((lock) => {
        if (!lock.milestoneKey?.startsWith(`item_${groupedItemId}_ms_`)) return false;
        return Number(lock.qty || 0) > 0;
      });
    });

    if (blockedByItemId) {
      return `Disabled by ${group.name}: another item in this group already has a value for this row.`;
    }
  }

  return "";
}
