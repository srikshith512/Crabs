"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Trash2,
  Plus,
  Save,
  Ruler,
  Clipboard,
  FileDown,
  LayoutGrid,
  Columns,
  Search,
  MoreVertical,
  Weight,
  TrendingUp,
  X,
  Edit2,
  Cloud,
  CloudOff,
  RefreshCw
} from "lucide-react";
import { calculateStructureWeight } from "@/lib/calculations/structure";
import { calculateOthersQuantity } from "@/lib/calculations/others";
import PipingLHSMeasurementSheet from "./piping-lhs-sheet";
import PipingSpoolStatusMeasurementSheet from "./piping-spool-status-sheet";
import PipingInsulationMeasurementSheet from "./piping-insulation-sheet";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
  id: string;
  order_id: string;
  item_code: string;
  description: string;
  short_description: string;
  unit: string;
  department: string;
  quantity: number;
  rate: number;
  milestones?: { name: string; percentage: number }[];
};

type MeasurementRow = {
  id?: string;
  description: string;
  structure_type?: string;
  mark?: string;
  length?: number;
  width?: number; // width = breadth for others
  thickness?: number; // thickness = height for others
  qty?: number; // qty = nos for others
  unit_weight?: number;
  total_weight?: number;
  milestone_values?: Record<string, number>;
};

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

const API_BASE = "http://localhost:5000/api";
const AUTOSAVE_DELAY = 1500;

export default function MeasurementSheetPage() {
  const params = useParams<{ projectId: string; orderId: string; itemId: string }>();
  const router = useRouter();

  const projectId = params?.projectId as string;
  const orderId = params?.orderId as string;
  const itemId = params?.itemId as string;

  const [item, setItem] = useState<Item | null>(null);
  const [departmentItems, setDepartmentItems] = useState<Item[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Save status tracking
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // New row state
  const [newRowActive, setNewRowActive] = useState(false);
  const [newRow, setNewRow] = useState<MeasurementRow>({
    description: "", structure_type: "", mark: "",
    length: undefined, width: undefined, thickness: undefined,
    qty: undefined, unit_weight: undefined, total_weight: 0,
    milestone_values: {}
  });

  const [isSaving, setIsSaving] = useState(false);

  // After first save, the new row gets an ID so subsequent changes become updates
  const [newRowSavedId, setNewRowSavedId] = useState<string | null>(null);
  const newRowSavedIdRef = useRef<string | null>(null);

  // Sync ref
  useEffect(() => { newRowSavedIdRef.current = newRowSavedId; }, [newRowSavedId]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<MeasurementRow>({
    description: "", structure_type: "", mark: "",
    length: undefined, width: undefined, thickness: undefined,
    qty: undefined, unit_weight: undefined, total_weight: 0,
    milestone_values: {}
  });
  const [editSaveStatus, setEditSaveStatus] = useState<SaveStatus>("idle");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Refs
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const newRowRef = useRef(newRow);
  const newRowContainerRef = useRef<HTMLTableRowElement>(null);

  // Edit autosave refs
  const editAutosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEditSavingRef = useRef(false);
  const editRowRef = useRef(editRow);
  const editRowContainerRef = useRef<HTMLTableRowElement>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All Areas");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    description: "", type: "", mark: "",
  });

  // Keep refs in sync
  useEffect(() => { newRowRef.current = newRow; }, [newRow]);
  useEffect(() => { editRowRef.current = editRow; }, [editRow]);

  useEffect(() => {
    if (!projectId || !orderId || !itemId) return;
    if (projectId.startsWith("[")) return;
    void loadData();
  }, [projectId, orderId, itemId]);

  // Cleanup edit timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
    };
  }, []);

  const getSessionToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString || sessionString === "null") {
      router.push("/login");
      return null;
    }
    const session = JSON.parse(sessionString);
    return session?.access_token as string | null;
  };

  const loadData = async () => {
    const token = getSessionToken();
    if (!token) return;
    try {
      setIsLoading(true);
      const itemsRes = await fetch(`${API_BASE}/items/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!itemsRes.ok) throw new Error("Failed to load item API");
      const iData = await itemsRes.json();
      const itemsList = iData.items || [];
      const currentItem = itemsList.find((i: any) => i.id === itemId);
      if (currentItem) {
        setItem(currentItem);
        if (currentItem.department) {
          setDepartmentItems(itemsList.filter((i: any) => i.department === currentItem.department));
        }
      }

      const measurementRes = await fetch(`${API_BASE}/measurements/item/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (measurementRes.ok) {
        const mData = await measurementRes.json();
        setMeasurements(mData.measurements || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate weight for new row
  useEffect(() => {
    if (item?.department === "Structure") {
      const w = calculateStructureWeight(
        Number(newRow.length || 0), Number(newRow.width || 1),
        Number(newRow.thickness || 1), Number(newRow.qty || 0),
        Number(newRow.unit_weight || 0)
      );
      setNewRow(prev => ({ ...prev, total_weight: w }));
    } else if (item?.department === "Others") {
      const q = calculateOthersQuantity(
        Number(newRow.length || 0), Number(newRow.width || 0),
        Number(newRow.thickness || 0), Number(newRow.qty || 1)
      );
      setNewRow(prev => ({ ...prev, total_weight: q }));
    }
  }, [newRow.length, newRow.width, newRow.thickness, newRow.qty, newRow.unit_weight, item?.department]);

  // Auto-calculate weight for edit row
  useEffect(() => {
    if (editingRowId) {
      if (item?.department === "Structure") {
        const w = calculateStructureWeight(
          Number(editRow.length || 0), Number(editRow.width || 1),
          Number(editRow.thickness || 1), Number(editRow.qty || 0),
          Number(editRow.unit_weight || 0)
        );
        setEditRow(prev => ({ ...prev, total_weight: w }));
      } else if (item?.department === "Others") {
        const q = calculateOthersQuantity(
          Number(editRow.length || 0), Number(editRow.width || 0),
          Number(editRow.thickness || 0), Number(editRow.qty || 1)
        );
        setEditRow(prev => ({ ...prev, total_weight: q }));
      }
    }
  }, [editRow.length, editRow.width, editRow.thickness, editRow.qty, editRow.unit_weight, item?.department, editingRowId]);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  NEW ROW: Autosave (create first, then update)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const performNewRowSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const performNewRowSave = async () => {
    const currentRow = newRowRef.current;
    if (!currentRow.description?.trim()) return;
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    const token = getSessionToken();
    if (!token) { isSavingRef.current = false; setSaveStatus("error"); return; }

    try {
      const payload = {
        location_description: currentRow.description,
        length: currentRow.length || 0,
        breadth: currentRow.width || 0,
        depth: currentRow.thickness || 0,
        quantity: currentRow.total_weight || 0,
        custom_fields: {
          structure_type: currentRow.structure_type,
          mark: currentRow.mark,
          unit_weight: currentRow.unit_weight,
          width: currentRow.width,
          thickness: currentRow.thickness,
          length: currentRow.length,
          qty: currentRow.qty,
          milestone_values: currentRow.milestone_values
        }
      };

      // If we already saved this row once, PUT to update it based on ref
      const savedId = newRowSavedIdRef.current;
      let url: string;
      let method: string;

      if (savedId) {
        url = `${API_BASE}/measurements/${savedId}`;
        method = "PUT";
      } else {
        url = `${API_BASE}/measurements/item/${itemId}`;
        method = "POST";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to save");
      }

      const { measurement } = await response.json();

      if (savedId) {
        // Update existing entry in measurements array
        setMeasurements(prev => prev.map(m => m.id === savedId ? measurement : m));
      } else {
        // First save â€” add to array and store the ID
        setMeasurements(prev => [...prev, measurement]);
        setNewRowSavedId(measurement.id);
      }

      setLastSavedAt(new Date());
      setSaveStatus("saved");
      setTimeout(() => { setSaveStatus("idle"); }, 2000);
    } catch (e: any) {
      console.error("Autosave failed:", e);
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  };

  performNewRowSaveRef.current = performNewRowSave;

  const scheduleNewRowAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setSaveStatus("unsaved");
    autosaveTimerRef.current = setTimeout(() => {
      void performNewRowSaveRef.current?.();
    }, AUTOSAVE_DELAY);
  }, []);

  const updateNewRow = (updates: Partial<MeasurementRow>) => {
    setNewRow(prev => ({ ...prev, ...updates }));
    scheduleNewRowAutosave();
  };

  const manualNewRowSave = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await performNewRowSave();
    
    // After manual save (e.g. Enter key), prep for the NEXT row!
    setNewRowSavedId(null);
    setSaveStatus("idle");
    setNewRow({
      description: "", structure_type: "", mark: "",
      length: undefined, width: undefined, thickness: undefined,
      qty: undefined, unit_weight: undefined, total_weight: 0,
      milestone_values: {}
    });
  };

  const handleAddRow = () => {
    // Close any editing row first
    if (editingRowId) handleCancelEdit();
    setNewRowActive(true);
    setNewRowSavedId(null);
    setSaveStatus("idle");
    setNewRow({
      description: "", structure_type: "", mark: "",
      length: undefined, width: undefined, thickness: undefined,
      qty: undefined, unit_weight: undefined, total_weight: 0
    });
  };

  const handleCancelNewRow = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setNewRowActive(false);
    setNewRowSavedId(null);
    setSaveStatus("idle");
    setNewRow({
      description: "", structure_type: "", mark: "",
      length: undefined, width: undefined, thickness: undefined,
      qty: undefined, unit_weight: undefined, total_weight: 0
    });
  };

  const handleNewRowBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (newRowContainerRef.current && relatedTarget && newRowContainerRef.current.contains(relatedTarget)) return;
    if (newRowRef.current.description?.trim()) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      void performNewRowSaveRef.current?.();
    }
  };

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); void manualNewRowSave(); }
    else if (e.key === "Escape") { handleCancelNewRow(); }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  EDIT EXISTING ROW: Inline edit + autosave
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const startEditing = (m: any) => {
    // Close new row if active
    if (newRowActive) handleCancelNewRow();
    setEditingRowId(m.id);
    setEditSaveStatus("idle");
    setEditRow({
      id: m.id,
      description: m.location_description || "",
      structure_type: m.custom_fields?.structure_type || "",
      mark: m.custom_fields?.mark || "",
      unit_weight: m.custom_fields?.unit_weight ?? undefined,
      length: m.custom_fields?.length ?? undefined,
      width: m.custom_fields?.width ?? undefined,
      thickness: m.custom_fields?.thickness ?? undefined,
      qty: m.custom_fields?.qty ?? undefined,
      total_weight: Number(m.quantity || 0),
      milestone_values: m.custom_fields?.milestone_values || {}
    });
  };

  const performEditSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const performEditSave = async () => {
    const currentRow = editRowRef.current;
    if (!currentRow.description?.trim() || !currentRow.id) return;
    if (isEditSavingRef.current) return;

    isEditSavingRef.current = true;
    setEditSaveStatus("saving");

    const token = getSessionToken();
    if (!token) { isEditSavingRef.current = false; setEditSaveStatus("error"); return; }

    try {
      const payload = {
        location_description: currentRow.description,
        length: currentRow.length || 0,
        breadth: currentRow.width || 0,
        depth: currentRow.thickness || 0,
        quantity: currentRow.total_weight || 0,
        custom_fields: {
          structure_type: currentRow.structure_type,
          mark: currentRow.mark,
          unit_weight: currentRow.unit_weight,
          width: currentRow.width,
          thickness: currentRow.thickness,
          length: currentRow.length,
          qty: currentRow.qty,
          milestone_values: currentRow.milestone_values
        }
      };

      const response = await fetch(`${API_BASE}/measurements/${currentRow.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to update");
      }

      const { measurement } = await response.json();
      setMeasurements(prev => prev.map(m => m.id === currentRow.id ? measurement : m));
      setLastSavedAt(new Date());
      setEditSaveStatus("saved");
      setTimeout(() => { setEditSaveStatus("idle"); }, 2000);
    } catch (e: any) {
      console.error("Edit autosave failed:", e);
      setEditSaveStatus("error");
    } finally {
      isEditSavingRef.current = false;
    }
  };

  // Keep ref in sync so the timeout always calls the latest version
  performEditSaveRef.current = performEditSave;

  const scheduleEditAutosave = useCallback(() => {
    if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
    setEditSaveStatus("unsaved");
    editAutosaveTimerRef.current = setTimeout(() => {
      void performEditSaveRef.current?.();
    }, AUTOSAVE_DELAY);
  }, []);

  const updateEditRow = (updates: Partial<MeasurementRow>) => {
    setEditRow(prev => ({ ...prev, ...updates }));
    scheduleEditAutosave();
  };

  const manualEditSave = async () => {
    if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
    await performEditSave();
  };

  const handleCancelEdit = () => {
    if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
    setEditingRowId(null);
    setEditSaveStatus("idle");
  };

  const handleEditRowBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (editRowContainerRef.current && relatedTarget && editRowContainerRef.current.contains(relatedTarget)) return;
    if (editRowRef.current.description?.trim()) {
      if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
      void performEditSave();
    }
  };

  const handleEditRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); void manualEditSave(); }
    else if (e.key === "Escape") { handleCancelEdit(); }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  DELETE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const deleteMeasurement = async (id: string) => {
    const token = getSessionToken();
    if (!token) return;

    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE}/measurements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to delete");
      }

      setMeasurements(prev => prev.filter(m => m.id !== id));
      if (editingRowId === id) {
        setEditingRowId(null);
        setEditSaveStatus("idle");
      }
      triggerToast("Measurement deleted", "success");
    } catch (e: any) {
      triggerToast(`Delete failed: ${e.message}`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  COMPUTED VALUES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const isStructure = item?.department === "Structure";
  const isOthers = item?.department === "Others";
  const totalMT = measurements.reduce((sum, m) => sum + Number(m.quantity || 0), 0);
  const scope = item ? item.quantity : 0;
  const progressPercent = scope > 0 ? Math.min((totalMT / scope) * 100, 100) : 0;
  const totalAmount = item ? item.quantity * item.rate : 0;

  const filteredMeasurements = measurements.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(m.location_description || "").toLowerCase().includes(q)) return false;
    }
    if (columnFilters.description) {
      if (!(m.location_description || "").toLowerCase().includes(columnFilters.description.toLowerCase())) return false;
    }
    if (columnFilters.type && isStructure) {
      if (!(m.custom_fields?.structure_type || "").toLowerCase().includes(columnFilters.type.toLowerCase())) return false;
    }
    if (columnFilters.mark && isStructure) {
      if (!(m.custom_fields?.mark || "").toLowerCase().includes(columnFilters.mark.toLowerCase())) return false;
    }
    return true;
  });

  const departmentMilestones = departmentItems.flatMap(i => 
    (i.milestones || []).map(ms => ({
      itemId: i.id,
      itemCode: i.item_code,
      itemShortDesc: i.short_description || i.item_code || "Unknown",
      name: ms.name,
      percentage: ms.percentage,
      mapKey: `item_${i.id}_ms_${ms.name}`
    }))
  );

  // Active autosave status (whichever row is active)
  const activeSaveStatus = editingRowId ? editSaveStatus : saveStatus;

  // â”€â”€â”€ Status Indicator â”€â”€â”€
  const SaveStatusIndicator = () => {
    const statusConfig = {
      idle: { icon: null, text: "", color: "" },
      unsaved: {
        icon: <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />,
        text: "Unsaved changes", color: "text-amber-500"
      },
      saving: {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />,
        text: "Saving...", color: "text-blue-500"
      },
      saved: {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
        text: lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "Saved",
        color: "text-emerald-500"
      },
      error: {
        icon: <CloudOff className="w-3.5 h-3.5 text-red-500" />,
        text: "Save failed", color: "text-red-500"
      }
    };
    const config = statusConfig[activeSaveStatus];
    if (!config.text) return null;
    return (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-2 ${config.color}`}>
        {config.icon}
        <span className="text-[11px] font-bold tracking-wide">{config.text}</span>
      </motion.div>
    );
  };

  // â”€â”€â”€ Shared inline input class â”€â”€â”€
  const inputClass = "w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";
  const inputNumClass = "w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded text-sm font-mono text-right focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";

  const getRowColor = (status: SaveStatus) => {
    switch (status) {
      case "saving": return "bg-blue-50/60 dark:bg-blue-900/15 border-blue-300 dark:border-blue-700";
      case "saved": return "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-700";
      case "error": return "bg-red-50/40 dark:bg-red-900/10 border-red-300 dark:border-red-700";
      default: return "bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800";
    }
  };

  // â”€â”€â”€ Render inline cells (shared between new & edit rows) â”€â”€â”€
  const renderInlineCells = (
    row: MeasurementRow,
    updater: (updates: Partial<MeasurementRow>) => void,
    isAutoFocusFirst: boolean
  ) => (
    <>
      <td className="px-4 py-2">
        <input autoFocus={isAutoFocusFirst} type="text" placeholder="Description..."
          value={row.description} onChange={e => updater({ description: e.target.value })}
          className={inputClass} />
      </td>
      {isStructure && (
        <>
          <td className="px-4 py-2">
            <input type="text" placeholder="Type" value={row.structure_type || ""}
              onChange={e => updater({ structure_type: e.target.value })} className={inputClass} />
          </td>
          <td className="px-4 py-2">
            <input type="text" placeholder="Mark" value={row.mark || ""}
              onChange={e => updater({ mark: e.target.value })} className={inputClass} />
          </td>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="0" value={row.unit_weight ?? ""}
              onChange={e => updater({ unit_weight: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="0" value={row.length ?? ""}
              onChange={e => updater({ length: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="0" value={row.width ?? ""}
              onChange={e => updater({ width: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="0" value={row.thickness ?? ""}
              onChange={e => updater({ thickness: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
        </>
      )}
      {isOthers && (
        <>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="Length" value={row.length ?? ""}
              onChange={e => updater({ length: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="Breadth" value={row.width ?? ""}
              onChange={e => updater({ width: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
          <td className="px-4 py-2">
            <input type="number" step="0.001" placeholder="Height" value={row.thickness ?? ""}
              onChange={e => updater({ thickness: e.target.value ? Number(e.target.value) : undefined })}
              className={inputNumClass} />
          </td>
        </>
      )}
      <td className="px-4 py-2">
        <input type="number" step="1" placeholder="0" value={row.qty ?? ""}
          onChange={e => updater({ qty: e.target.value ? Number(e.target.value) : undefined })}
          className={inputNumClass} />
      </td>
      <td className="px-4 py-2">
        <div className="px-2.5 py-1.5 bg-slate-900 dark:bg-black text-white rounded font-mono text-sm text-right font-bold">
          {Number(row.total_weight || 0).toFixed(3)}
        </div>
      </td>
      {departmentMilestones.map((ms, msIdx) => (
        <td key={msIdx} className="px-4 py-2 text-center text-xs font-mono">
          <input 
            type="number" step="0.001" placeholder="qty"
            value={row.milestone_values?.[ms.mapKey] ?? ""}
            onChange={e => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              const newVals = { ...(row.milestone_values || {}) };
              if (val !== undefined) newVals[ms.mapKey] = val;
              else delete newVals[ms.mapKey];
              updater({ milestone_values: newVals });
            }}
            className={inputNumClass}
          />
        </td>
      ))}
    </>
  );

  const renderInlineActions = (
    currentSaveStatus: SaveStatus,
    onManualSave: () => void,
    onCancel: () => void,
    disableSave: boolean
  ) => (
    <td className="px-4 py-2">
      <div className="flex items-center gap-1">
        {currentSaveStatus === "saving" ? (
          <div className="p-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /></div>
        ) : currentSaveStatus === "saved" ? (
          <div className="p-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div>
        ) : (
          <button onClick={onManualSave} disabled={disableSave}
            className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-all"
            title="Save now (Enter)">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onCancel}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
          title="Close (Esc)">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </td>
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (item?.department === "Piping-LHS") {
    return (
      <PipingLHSMeasurementSheet projectId={projectId} orderId={orderId} itemId={itemId} />
    );
  }

  if (item?.department === "Piping-Spool Status") {
    return (
      <PipingSpoolStatusMeasurementSheet
        projectId={projectId}
        orderId={orderId}
        itemId={itemId}
      />
    );
  }

  if (item?.department === "Piping Insulation") {
    return (
      <PipingInsulationMeasurementSheet
        projectId={projectId}
        orderId={orderId}
        itemId={itemId}
      />
    );
  }

  return (
    <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* â”€â”€â”€ Back Link â”€â”€â”€ */}
      <div className="mb-5">
        <Link
          href={`/dashboard/projects/${projectId}/orders/${orderId}/items`}
          className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-2 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          Back to Items
        </Link>
      </div>

      {/* â”€â”€â”€ Title Bar â”€â”€â”€ */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Billing Quantity Entry
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-md">BOQ</span>
            {isStructure && (
              <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-md">Structure</span>
            )}
            {isOthers && (
              <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-md">General</span>
            )}
          </div>
          <div className="flex items-center gap-6 mt-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Item</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">{item?.description || "---"}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit Rate</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">â‚¹{item?.rate?.toLocaleString("en-IN") || "0"}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scope</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">{scope} {item?.unit}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">â‚¹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Weight</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{totalMT.toFixed(2)}</span>
            <span className="text-sm font-bold text-slate-400">{item?.unit || "Unit"}</span>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Work Entries Section â”€â”€â”€ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm mb-6">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Work Entries</h2>
                <SaveStatusIndicator />
              </div>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                Auto saves as you type â€¢ Press Enter to save instantly â€¢ Esc to close
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all">
                <Clipboard className="w-3.5 h-3.5" /> Paste Row
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all">
                <FileDown className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all">
                <LayoutGrid className="w-3.5 h-3.5" /> Groups
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all">
                <Columns className="w-3.5 h-3.5" /> Add Column
              </button>
              <button onClick={handleAddRow}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search by item description..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400" />
          </div>
          <div className="relative">
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
              <option>All Areas</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh] border border-slate-200 dark:border-slate-700 rounded-b-lg">
          <table className="w-full text-left border-collapse text-sm [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10">Sr.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[180px]">Item Description</th>
                {isStructure && (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mark No.</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Unit Weight</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Length</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Width</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Thickness</th>
                  </>
                )}
                {isOthers && (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Length</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Breadth</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Height</th>
                  </>
                )}
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">{isOthers ? "Nos" : "Qty"}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Total ({item?.unit || "Unit"})</th>
                {departmentMilestones.map((ms, idx) => (
                  <th key={idx} className="px-4 py-3 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-center min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="truncate max-w-[80px] text-slate-700 dark:text-slate-300 font-extrabold">{ms.itemShortDesc}</span>
                      <span className="text-[9px] text-blue-500 mt-0.5">{ms.percentage}%</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>

              {/* Column Search Filters */}
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2">
                  <input type="text" placeholder="Search..." value={columnFilters.description}
                    onChange={(e) => setColumnFilters({ ...columnFilters, description: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-500" />
                </td>
                {isStructure && (
                  <>
                    <td className="px-4 py-2">
                      <input type="text" placeholder="Search..." value={columnFilters.type}
                        onChange={(e) => setColumnFilters({ ...columnFilters, type: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" placeholder="Search..." value={columnFilters.mark}
                        onChange={(e) => setColumnFilters({ ...columnFilters, mark: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-500" />
                    </td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                  </>
                )}
                {isOthers && (
                  <>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                  </>
                )}
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2"></td>
                {departmentMilestones.map((_, idx) => (<td key={idx} className="px-4 py-2"></td>))}
                <td className="px-4 py-2"></td>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {/* Empty State */}
              {filteredMeasurements.length === 0 && !newRowActive && (
                <tr>
                  <td colSpan={20} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400 font-semibold">
                      No measurement entries match your filters.{" "}
                      <button onClick={handleAddRow} className="text-blue-600 hover:underline font-bold">Add a new row</button>{" "}
                      to get started.
                    </p>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {filteredMeasurements.map((m, idx) => {
                // If it's the currently active new row and hit autosave, don't show it twice
                if (m.id === newRowSavedId && newRowActive) return null;
                // If this row is being edited inline
                if (editingRowId === m.id) {
                  return (
                    <tr key={m.id}
                      ref={editRowContainerRef}
                      className={`border-t-2 transition-colors ${getRowColor(editSaveStatus)}`}
                      onKeyDown={handleEditRowKeyDown}
                      onBlur={handleEditRowBlur}
                    >
                      <td className="px-4 py-2 text-xs font-bold text-blue-500">{idx + 1}</td>
                      {renderInlineCells(editRow, updateEditRow, true)}
                      {renderInlineActions(editSaveStatus, manualEditSave, handleCancelEdit, !editRow.description)}
                    </tr>
                  );
                }

                // Normal display row
                return (
                  <tr key={m.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors group">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{m.location_description}</td>
                    {isStructure && (
                      <>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{m.custom_fields?.structure_type || "-"}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{m.custom_fields?.mark || "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.unit_weight ?? "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.length ?? "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.width ?? "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.thickness ?? "-"}</td>
                      </>
                    )}
                    {isOthers && (
                      <>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.length ?? "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.width ?? "-"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{m.custom_fields?.thickness ?? "-"}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-xs font-mono text-right font-semibold text-slate-900 dark:text-white">{m.custom_fields?.qty ?? "-"}</td>
                    <td className="px-4 py-3 text-sm font-bold font-mono text-right text-blue-600 dark:text-blue-400">{Number(m.quantity || 0).toFixed(3)}</td>
                    {departmentMilestones.map((ms, msIdx) => (
                      <td key={msIdx} className="px-4 py-3 text-xs font-mono text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">
                        {m.custom_fields?.milestone_values?.[ms.mapKey] !== undefined ? Number(m.custom_fields.milestone_values[ms.mapKey]).toFixed(3) : "-"}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(m)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                          title="Edit row"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMeasurement(m.id)}
                          disabled={deletingId === m.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all disabled:opacity-50"
                          title="Delete row"
                        >
                          {deletingId === m.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* New Row (inline add with autosave â€” stays open after save) */}
              {newRowActive && (
                <tr
                  ref={newRowContainerRef}
                  className={`border-t-2 transition-colors ${getRowColor(saveStatus)}`}
                  onKeyDown={handleNewRowKeyDown}
                  onBlur={handleNewRowBlur}
                >
                  <td className="px-4 py-2 text-xs font-bold text-blue-500">
                    {/* Show correct number: if already saved, it's in the array */}
                    {newRowSavedId ? filteredMeasurements.length : filteredMeasurements.length + 1}
                  </td>
                  {renderInlineCells(newRow, updateNewRow, true)}
                  {renderInlineActions(saveStatus, manualNewRowSave, handleCancelNewRow, !newRow.description)}
                </tr>
              )}
            </tbody>

            {/* Subtotal Footer */}
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/30 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-extrabold text-slate-900 dark:text-white">Subtotal Â· All Areas</td>
                {isStructure && (<><td className="px-4 py-3"></td><td className="px-4 py-3"></td><td className="px-4 py-3"></td><td className="px-4 py-3"></td><td className="px-4 py-3"></td><td className="px-4 py-3"></td></>)}
                {isOthers && (<><td className="px-4 py-3"></td><td className="px-4 py-3"></td><td className="px-4 py-3"></td></>)}
                <td className="px-4 py-3 text-sm font-extrabold text-right text-slate-900 dark:text-white font-mono">
                  {isOthers ? "Nos" : "Qty"}: {filteredMeasurements.reduce((s, m) => s + Number(m.custom_fields?.qty || 0), 0).toFixed(0)}
                </td>
                <td className="px-4 py-3 text-sm font-black text-right text-blue-600 dark:text-blue-400 font-mono">
                  {totalMT.toFixed(3)} {item?.unit || "Unit"}
                </td>
                {departmentMilestones.map((ms, msIdx) => {
                  const msTotal = filteredMeasurements.reduce((sum, m) => {
                    const val = m.custom_fields?.milestone_values?.[ms.mapKey];
                    return sum + (val !== undefined ? Number(val) : 0);
                  }, 0);
                  return (
                    <td key={msIdx} className="px-4 py-3 text-xs font-bold font-mono text-right text-slate-600 dark:text-slate-400">
                      {msTotal > 0 ? msTotal.toFixed(3) : "-"}
                    </td>
                  );
                })}
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* â”€â”€â”€ Summary Cards â”€â”€â”€ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
            <Weight className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item?.unit || "Unit"}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">{totalMT.toFixed(3)}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Measured Weight</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">%</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">{progressPercent.toFixed(0)}%</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Overall Milestone Progress</p>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Toast â”€â”€â”€ */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-4 flex items-center gap-4 min-w-[300px] overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${toastType === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toastType === "success" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-red-50 dark:bg-red-900/20 text-red-600"}`}>
              {toastType === "success" ? <CheckCircle2 className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white">{toastMessage}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {toastType === "success" ? "Done" : "Please retry"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}





