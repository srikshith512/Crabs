"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api-config";
import type { ItemGroup } from "@/lib/item-groups";

const getSessionToken = () => {
  const sessionString = localStorage.getItem("session");
  if (!sessionString || sessionString === "null") return null;
  return JSON.parse(sessionString)?.access_token as string | null;
};

export function useItemGroups(orderId: string, department?: string) {
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const request = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getSessionToken();
    if (!token) throw new Error("Please log in again.");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to save group");
    return data;
  }, []);

  const loadGroups = useCallback(async () => {
    if (!orderId || !department) {
      setGroups([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = getSessionToken();
      if (!token) throw new Error("Please log in again.");
      const response = await fetch(
        `${API_BASE}/item-groups/order/${orderId}?department=${encodeURIComponent(department)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to load groups");
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [department, orderId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const createGroup = async () => {
    if (!department) throw new Error("Department is required.");
    const data = await request(`${API_BASE}/item-groups/order/${orderId}`, {
      method: "POST",
      body: JSON.stringify({
        department,
        name: `Group ${groups.length + 1}`,
        is_active: false,
        selected_item_ids: [],
      }),
    });
    setGroups((prev) => [...prev, data.group]);
  };

  const updateGroup = async (groupId: string, updates: Partial<ItemGroup>) => {
    const data = await request(`${API_BASE}/item-groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setGroups((prev) => prev.map((group) => (group.id === groupId ? data.group : group)));
  };

  const deleteGroup = async (groupId: string) => {
    await request(`${API_BASE}/item-groups/${groupId}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  return {
    groups,
    setGroups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    reloadGroups: loadGroups,
  };
}
