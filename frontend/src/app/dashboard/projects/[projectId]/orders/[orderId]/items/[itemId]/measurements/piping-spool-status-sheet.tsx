"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  CloudOff,
  Columns,
  Edit2,
  FileDown,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Weight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateSpoolInchMeter,
  calculateSpoolStatusQuantity,
} from "@/lib/calculations/piping-spool-status";
import { API_BASE } from "@/lib/api-config";

type Item = {
  id: string;
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
  area: string;
  drawingNo: string;
  revNo: string;
  sheetNo: string;
  spoolNo: string;
  lineSize?: number;
  baseMaterial: string;
  length?: number;
  inchMeter: number;
  surfaceArea: string;
  paintSystem: string;
  remarks: string;
  total: number;
  milestoneValues: Record<string, number>;
  customFields?: Record<string, any>;
};

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

type Props = {
  projectId: string;
  orderId: string;
  itemId: string;
};

const AUTOSAVE_DELAY = 1500;

const createEmptyRow = (): MeasurementRow => ({
  area: "",
  drawingNo: "",
  revNo: "",
  sheetNo: "",
  spoolNo: "",
  lineSize: undefined,
  baseMaterial: "",
  length: undefined,
  inchMeter: 0,
  surfaceArea: "",
  paintSystem: "",
  remarks: "",
  total: 0,
  milestoneValues: {},
});

const buildPayload = (row: MeasurementRow) => ({
  location_description: row.spoolNo || row.drawingNo || row.area,
  length: row.length || 0,
  breadth: row.lineSize || 0,
  depth: row.surfaceArea ? Number(row.surfaceArea) || 0 : 0,
  quantity: row.total || 0,
  custom_fields: {
    ...(row.customFields || {}),
    area: row.area,
    drawingNo: row.drawingNo,
    revNo: row.revNo,
    sheetNo: row.sheetNo,
    spoolNo: row.spoolNo,
    lineSize: row.lineSize,
    baseMaterial: row.baseMaterial,
    inchMeter: row.inchMeter,
    surfaceArea: row.surfaceArea,
    paintSystem: row.paintSystem,
    remarks: row.remarks,
    milestone_values: row.milestoneValues,
  },
});

const hydrateRow = (measurement: any): MeasurementRow => ({
  id: measurement.id,
  area: measurement.custom_fields?.area || "",
  drawingNo: measurement.custom_fields?.drawingNo || "",
  revNo: measurement.custom_fields?.revNo || "",
  sheetNo: measurement.custom_fields?.sheetNo || "",
  spoolNo: measurement.custom_fields?.spoolNo || measurement.location_description || "",
  lineSize: measurement.custom_fields?.lineSize ?? undefined,
  baseMaterial: measurement.custom_fields?.baseMaterial || "",
  length: measurement.length ?? undefined,
  inchMeter: Number(measurement.custom_fields?.inchMeter || measurement.quantity || 0),
  surfaceArea: String(measurement.custom_fields?.surfaceArea || ""),
  paintSystem: measurement.custom_fields?.paintSystem || "",
  remarks: measurement.custom_fields?.remarks || "",
  total: Number(measurement.quantity || 0),
  milestoneValues: measurement.custom_fields?.milestone_values || {},
  customFields: measurement.custom_fields,
});

const hasRequiredValues = (row: MeasurementRow) =>
  Boolean(row.spoolNo.trim() || row.drawingNo.trim() || row.area.trim());

export default function PipingSpoolStatusMeasurementSheet({
  projectId,
  orderId,
  itemId,
}: Props) {
  const [item, setItem] = useState<Item | null>(null);
  const [departmentItems, setDepartmentItems] = useState<Item[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All Areas");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    area: "",
    drawingNo: "",
    revNo: "",
    sheetNo: "",
    spoolNo: "",
    lineSize: "",
    baseMaterial: "",
    paintSystem: "",
    remarks: "",
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [editSaveStatus, setEditSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [newRowActive, setNewRowActive] = useState(false);
  const [newRow, setNewRow] = useState<MeasurementRow>(createEmptyRow());
  const [newRowSavedId, setNewRowSavedId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<MeasurementRow>(createEmptyRow());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editAutosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const isEditSavingRef = useRef(false);
  const newRowSavedIdRef = useRef<string | null>(null);
  const newRowRef = useRef(newRow);
  const editRowRef = useRef(editRow);
  const newRowContainerRef = useRef<HTMLTableRowElement>(null);
  const editRowContainerRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    newRowSavedIdRef.current = newRowSavedId;
  }, [newRowSavedId]);

  useEffect(() => {
    newRowRef.current = newRow;
  }, [newRow]);

  useEffect(() => {
    editRowRef.current = editRow;
  }, [editRow]);

  useEffect(() => {
    setNewRow((prev) => {
      const inchMeter = calculateSpoolInchMeter(
        Number(prev.length || 0),
        Number(prev.lineSize || 0),
      );
      return {
        ...prev,
        inchMeter,
        total: calculateSpoolStatusQuantity(inchMeter),
      };
    });
  }, [newRow.length, newRow.lineSize]);

  useEffect(() => {
    if (!editingRowId) return;
    setEditRow((prev) => {
      const inchMeter = calculateSpoolInchMeter(
        Number(prev.length || 0),
        Number(prev.lineSize || 0),
      );
      return {
        ...prev,
        inchMeter,
        total: calculateSpoolStatusQuantity(inchMeter),
      };
    });
  }, [editRow.length, editRow.lineSize, editingRowId]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
    };
  }, []);

  const getSessionToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString || sessionString === "null") {
      window.location.href = "/login";
      return null;
    }
    const session = JSON.parse(sessionString);
    return session?.access_token as string | null;
  };

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const loadData = async () => {
    const token = getSessionToken();
    if (!token) return;
    try {
      setIsLoading(true);
      const itemsRes = await fetch(`${API_BASE}/items/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!itemsRes.ok) throw new Error("Failed to load items");
      const itemsData = await itemsRes.json();
      const items = itemsData.items || [];
      const currentItem = items.find((entry: any) => entry.id === itemId);
      if (currentItem) {
        setItem(currentItem);
        setDepartmentItems(
          items.filter((entry: any) => entry.department === currentItem.department),
        );
      }

      const measurementRes = await fetch(`${API_BASE}/measurements/item/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (measurementRes.ok) {
        const measurementData = await measurementRes.json();
        setMeasurements(measurementData.measurements || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId || !orderId || !itemId) return;
    void loadData();
  }, [projectId, orderId, itemId]);

  const performNewRowSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const performEditSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const performNewRowSave = async () => {
    const row = newRowRef.current;
    if (!hasRequiredValues(row) || isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus("saving");
    const token = getSessionToken();
    if (!token) {
      isSavingRef.current = false;
      setSaveStatus("error");
      return;
    }

    try {
      const savedId = newRowSavedIdRef.current;
      const response = await fetch(
        savedId ? `${API_BASE}/measurements/${savedId}` : `${API_BASE}/measurements/item/${itemId}`,
        {
          method: savedId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildPayload(row)),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save row");
      }

      const { measurement } = await response.json();
      if (savedId) {
        setMeasurements((prev) =>
          prev.map((entry) => (entry.id === savedId ? measurement : entry)),
        );
      } else {
        setMeasurements((prev) => [...prev, measurement]);
        setNewRowSavedId(measurement.id);
      }
      // Store the returned custom_fields in the new row state for subsequent PUTs
      setNewRow(prev => ({ ...prev, customFields: measurement.custom_fields }));
      setLastSavedAt(new Date());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  };

  const performEditSave = async () => {
    const row = editRowRef.current;
    if (!row.id || !hasRequiredValues(row) || isEditSavingRef.current) return;

    isEditSavingRef.current = true;
    setEditSaveStatus("saving");
    const token = getSessionToken();
    if (!token) {
      isEditSavingRef.current = false;
      setEditSaveStatus("error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/measurements/${row.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload(row)),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update row");
      }

      const { measurement } = await response.json();
      setMeasurements((prev) =>
        prev.map((entry) => (entry.id === row.id ? measurement : entry)),
      );
      setLastSavedAt(new Date());
      setEditSaveStatus("saved");
      setTimeout(() => setEditSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(error);
      setEditSaveStatus("error");
    } finally {
      isEditSavingRef.current = false;
    }
  };

  performNewRowSaveRef.current = performNewRowSave;
  performEditSaveRef.current = performEditSave;

  const scheduleNewRowAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setSaveStatus("unsaved");
    autosaveTimerRef.current = setTimeout(() => {
      void performNewRowSaveRef.current?.();
    }, AUTOSAVE_DELAY);
  }, []);

  const scheduleEditAutosave = useCallback(() => {
    if (editAutosaveTimerRef.current) clearTimeout(editAutosaveTimerRef.current);
    setEditSaveStatus("unsaved");
    editAutosaveTimerRef.current = setTimeout(() => {
      void performEditSaveRef.current?.();
    }, AUTOSAVE_DELAY);
  }, []);

  const manualNewRowSave = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await performNewRowSave();
    setNewRow(createEmptyRow());
    setNewRowSavedId(null);
    setSaveStatus("idle");
    setNewRowActive(true);
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

  const getRowColor = (status: SaveStatus) => {
    switch (status) {
      case "saving":
        return "bg-blue-50/60 dark:bg-blue-900/15 border-blue-300 dark:border-blue-700";
      case "saved":
        return "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-700";
      case "error":
        return "bg-red-50/40 dark:bg-red-900/10 border-red-300 dark:border-red-700";
      default:
        return "bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800";
    }
  };

  const updateNewRow = (updates: Partial<MeasurementRow>) => {
    setNewRow((prev) => ({ ...prev, ...updates }));
    scheduleNewRowAutosave();
  };

  const updateEditRow = (updates: Partial<MeasurementRow>) => {
    setEditRow((prev) => ({ ...prev, ...updates }));
    scheduleEditAutosave();
  };

  const handleAddRow = () => {
    if (editingRowId) {
      setEditingRowId(null);
      setEditSaveStatus("idle");
    }
    setNewRow(createEmptyRow());
    setNewRowSavedId(null);
    setSaveStatus("idle");
    setNewRowActive(true);
  };

  const handleCancelNewRow = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setNewRowActive(false);
    setNewRowSavedId(null);
    setSaveStatus("idle");
    setNewRow(createEmptyRow());
  };

  const startEditing = (measurement: any) => {
    if (newRowActive) handleCancelNewRow();
    setEditingRowId(measurement.id);
    setEditSaveStatus("idle");
    setEditRow(hydrateRow(measurement));
  };

  const deleteMeasurement = async (id: string) => {
    const token = getSessionToken();
    if (!token) return;
    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE}/measurements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete row");
      }
      setMeasurements((prev) => prev.filter((entry) => entry.id !== id));
      setEditingRowId((prev) => (prev === id ? null : prev));
      triggerToast("Measurement deleted", "success");
    } catch (error: any) {
      triggerToast(`Delete failed: ${error.message}`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const totalMeasured = measurements.reduce(
    (sum, measurement) => sum + Number(measurement.quantity || 0),
    0,
  );
  const totalAmount = item ? item.quantity * item.rate : 0;
  const progressPercent =
    item && item.quantity > 0
      ? Math.min((totalMeasured / item.quantity) * 100, 100)
      : 0;
  const areaOptions = [
    "All Areas",
    ...Array.from(
      new Set(
        measurements
          .map((measurement) => measurement.custom_fields?.area || "")
          .filter(Boolean),
      ),
    ),
  ];

  const filteredMeasurements = measurements.filter((measurement) => {
    const values = {
      area: String(measurement.custom_fields?.area || "").toLowerCase(),
      drawingNo: String(measurement.custom_fields?.drawingNo || "").toLowerCase(),
      revNo: String(measurement.custom_fields?.revNo || "").toLowerCase(),
      sheetNo: String(measurement.custom_fields?.sheetNo || "").toLowerCase(),
      spoolNo: String(
        measurement.custom_fields?.spoolNo || measurement.location_description || "",
      ).toLowerCase(),
      lineSize: String(measurement.custom_fields?.lineSize || "").toLowerCase(),
      baseMaterial: String(measurement.custom_fields?.baseMaterial || "").toLowerCase(),
      paintSystem: String(measurement.custom_fields?.paintSystem || "").toLowerCase(),
      remarks: String(measurement.custom_fields?.remarks || "").toLowerCase(),
    };

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesQuery = Object.values(values).some((value) => value.includes(query));
      if (!matchesQuery) return false;
    }

    if (areaFilter !== "All Areas" && (measurement.custom_fields?.area || "") !== areaFilter) {
      return false;
    }

    return Object.entries(columnFilters).every(([key, filterValue]) => {
      if (!filterValue) return true;
      return values[key as keyof typeof values].includes(filterValue.toLowerCase());
    });
  });

  const filteredTotal = filteredMeasurements.reduce(
    (sum, measurement) => sum + Number(measurement.quantity || 0),
    0,
  );
  const departmentMilestones = departmentItems.flatMap((entry) =>
    (entry.milestones || []).map((milestone) => ({
      itemId: entry.id,
      itemShortDesc: entry.short_description || entry.item_code || "Unknown",
      percentage: milestone.percentage,
      mapKey: `item_${entry.id}_ms_${milestone.name}`,
    })),
  );
  const activeSaveStatus = editingRowId ? editSaveStatus : saveStatus;
  const inputClass =
    "w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";
  const inputNumClass =
    "w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded text-sm font-mono text-right focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";

  const SaveStatusIndicator = () => {
    const config = {
      idle: { icon: null, text: "", color: "" },
      unsaved: {
        icon: <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />,
        text: "Unsaved changes",
        color: "text-amber-500",
      },
      saving: {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />,
        text: "Saving...",
        color: "text-blue-500",
      },
      saved: {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
        text: lastSavedAt
          ? `Saved at ${lastSavedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
          : "Saved",
        color: "text-emerald-500",
      },
      error: {
        icon: <CloudOff className="w-3.5 h-3.5 text-red-500" />,
        text: "Save failed",
        color: "text-red-500",
      },
    }[activeSaveStatus];

    if (!config.text) return null;
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-2 ${config.color}`}
      >
        {config.icon}
        <span className="text-[11px] font-bold tracking-wide">{config.text}</span>
      </motion.div>
    );
  };

  const milestoneCells = (
    row: MeasurementRow,
    updater: (updates: Partial<MeasurementRow>) => void,
  ) =>
    departmentMilestones.map((milestone, index) => (
      <td key={index} className="px-4 py-2 text-center text-xs font-mono">
        <input
          type="number"
          step="0.001"
          placeholder="qty"
          value={row.milestoneValues[milestone.mapKey] ?? ""}
          onChange={(e) => {
            const next = { ...row.milestoneValues };
            if (e.target.value) next[milestone.mapKey] = Number(e.target.value);
            else delete next[milestone.mapKey];
            updater({ milestoneValues: next });
          }}
          className={inputNumClass}
        />
      </td>
    ));

  const renderEditableCells = (
    row: MeasurementRow,
    updater: (updates: Partial<MeasurementRow>) => void,
    autoFocusFirst: boolean,
  ) => (
    <>
      <td className="px-4 py-2"><input autoFocus={autoFocusFirst} value={row.area} onChange={(e) => updater({ area: e.target.value })} className={inputClass} placeholder="Area" /></td>
      <td className="px-4 py-2"><input value={row.drawingNo} onChange={(e) => updater({ drawingNo: e.target.value })} className={inputClass} placeholder="Drawing No." /></td>
      <td className="px-4 py-2"><input value={row.revNo} onChange={(e) => updater({ revNo: e.target.value })} className={inputClass} placeholder="Rev No." /></td>
      <td className="px-4 py-2"><input value={row.sheetNo} onChange={(e) => updater({ sheetNo: e.target.value })} className={inputClass} placeholder="Sheet No." /></td>
      <td className="px-4 py-2"><input value={row.spoolNo} onChange={(e) => updater({ spoolNo: e.target.value })} className={inputClass} placeholder="Spool No." /></td>
      <td className="px-4 py-2"><input type="number" step="0.001" value={row.lineSize ?? ""} onChange={(e) => updater({ lineSize: e.target.value ? Number(e.target.value) : undefined })} className={inputNumClass} placeholder="0" /></td>
      <td className="px-4 py-2"><input value={row.baseMaterial} onChange={(e) => updater({ baseMaterial: e.target.value })} className={inputClass} placeholder="MOC" /></td>
      <td className="px-4 py-2"><input type="number" step="0.001" value={row.length ?? ""} onChange={(e) => updater({ length: e.target.value ? Number(e.target.value) : undefined })} className={inputNumClass} placeholder="0" /></td>
      <td className="px-4 py-2"><div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-mono text-sm text-right font-bold">{Number(row.inchMeter || 0).toFixed(3)}</div></td>
      <td className="px-4 py-2"><input value={row.surfaceArea} onChange={(e) => updater({ surfaceArea: e.target.value })} className={inputClass} placeholder="Painting Area" /></td>
      <td className="px-4 py-2"><input value={row.paintSystem} onChange={(e) => updater({ paintSystem: e.target.value })} className={inputClass} placeholder="Paint System" /></td>
      <td className="px-4 py-2"><input value={row.remarks} onChange={(e) => updater({ remarks: e.target.value })} className={inputClass} placeholder="Remarks" /></td>
      <td className="px-4 py-2"><div className="px-2.5 py-1.5 bg-slate-900 dark:bg-black text-white rounded font-mono text-sm text-right font-bold">{Number(row.total || 0).toFixed(3)}</div></td>
      {milestoneCells(row, updater)}
    </>
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-5">
        <Link href={`/dashboard/projects/${projectId}/orders/${orderId}/items`} className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-2 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          Back to Items
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Billing Quantity Entry</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-md">BOQ</span>
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-md">Piping-Spool Status</span>
          </div>
          <div className="flex items-center gap-6 mt-3 flex-wrap">
            <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Item</span><span className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[220px]">{item?.description || "---"}</span></div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit Rate</span><span className="text-sm font-extrabold text-slate-900 dark:text-white">INR {item?.rate?.toLocaleString("en-IN") || "0"}</span></div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scope</span><span className="text-sm font-extrabold text-slate-900 dark:text-white">{item?.quantity || 0} {item?.unit}</span></div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount</span><span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">INR {totalAmount.toLocaleString("en-IN")}</span></div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Quantity</span>
          <div className="flex items-baseline gap-1"><span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{totalMeasured.toFixed(2)}</span><span className="text-sm font-bold text-slate-400">{item?.unit || "Unit"}</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3"><h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Work Entries</h2><SaveStatusIndicator /></div>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Auto saves as you type • Press Enter to save instantly • Esc to close</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all"><Clipboard className="w-3.5 h-3.5" /> Paste Row</button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all"><FileDown className="w-3.5 h-3.5" /> Export CSV</button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all"><LayoutGrid className="w-3.5 h-3.5" /> Groups</button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all"><Columns className="w-3.5 h-3.5" /> Add Column</button>
              <button onClick={handleAddRow} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-lg shadow-blue-600/20"><Plus className="w-3.5 h-3.5" /> Add Row</button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><input type="text" placeholder="Search by spool, drawing, area..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400" /></div>
          <div className="relative"><select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="appearance-none pl-4 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm font-bold text-slate-900 dark:text-white cursor-pointer">{areaOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" /></div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[65vh] border border-slate-200 dark:border-slate-700 rounded-b-lg">
          <table className="w-full text-left border-collapse text-sm [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10">Sr.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[120px]">Area</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[140px]">Drawing No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[90px]">Rev No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[110px]">Sheet No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[140px]">Spool No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right min-w-[110px]">Line Size</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[110px]">MOC</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right min-w-[110px]">Length (m)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right min-w-[120px]">Inch Meter</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[130px]">Painting Area</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[140px]">Paint System</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[180px]">Remarks</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Total ({item?.unit || "Unit"})</th>
                {departmentMilestones.map((milestone, index) => (
                  <th key={index} className="px-4 py-3 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-center min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="truncate max-w-[80px] text-slate-700 dark:text-slate-300 font-extrabold">{milestone.itemShortDesc}</span>
                      <span className="text-[9px] text-blue-500 mt-0.5">{milestone.percentage}%</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2"><input value={columnFilters.area} onChange={(e) => setColumnFilters((prev) => ({ ...prev, area: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.drawingNo} onChange={(e) => setColumnFilters((prev) => ({ ...prev, drawingNo: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.revNo} onChange={(e) => setColumnFilters((prev) => ({ ...prev, revNo: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.sheetNo} onChange={(e) => setColumnFilters((prev) => ({ ...prev, sheetNo: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.spoolNo} onChange={(e) => setColumnFilters((prev) => ({ ...prev, spoolNo: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.lineSize} onChange={(e) => setColumnFilters((prev) => ({ ...prev, lineSize: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.baseMaterial} onChange={(e) => setColumnFilters((prev) => ({ ...prev, baseMaterial: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2"><input value={columnFilters.paintSystem} onChange={(e) => setColumnFilters((prev) => ({ ...prev, paintSystem: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"><input value={columnFilters.remarks} onChange={(e) => setColumnFilters((prev) => ({ ...prev, remarks: e.target.value }))} className={inputClass} placeholder="Search..." /></td>
                <td className="px-4 py-2"></td>
                {departmentMilestones.map((_, index) => <td key={index} className="px-4 py-2"></td>)}
                <td className="px-4 py-2"></td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {filteredMeasurements.length === 0 && !newRowActive && (
                <tr><td colSpan={15 + departmentMilestones.length} className="px-6 py-12 text-center"><p className="text-sm text-slate-400 font-semibold">No measurement entries match your filters. <button onClick={handleAddRow} className="text-blue-600 hover:underline font-bold">Add a new row</button> to get started.</p></td></tr>
              )}
              {filteredMeasurements.map((measurement, index) => {
                if (measurement.id === newRowSavedId && newRowActive) return null;
                if (editingRowId === measurement.id) {
                  return (
                    <tr key={measurement.id} ref={editRowContainerRef} className={`border-t-2 transition-colors ${getRowColor(editSaveStatus)}`} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void manualEditSave(); } if (e.key === "Escape") handleCancelEdit(); }} onBlur={(e) => { const relatedTarget = e.relatedTarget as HTMLElement | null; if (editRowContainerRef.current && relatedTarget && editRowContainerRef.current.contains(relatedTarget)) return; void performEditSave(); }}>
                      <td className="px-4 py-2 text-xs font-bold text-blue-500">{index + 1}</td>
                      {renderEditableCells(editRow, updateEditRow, true)}
                      <td className="px-4 py-2"><div className="flex items-center gap-1">{editSaveStatus === "saving" ? <div className="p-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /></div> : editSaveStatus === "saved" ? <div className="p-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div> : <button onClick={() => void manualEditSave()} disabled={!hasRequiredValues(editRow)} className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-all"><CheckCircle2 className="w-3.5 h-3.5" /></button>}<button onClick={handleCancelEdit} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"><X className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  );
                }
                return (
                  <tr key={measurement.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors group">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.area || "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.drawingNo || "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.revNo || "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.sheetNo || "-"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{measurement.custom_fields?.spoolNo || measurement.location_description || "-"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{measurement.custom_fields?.lineSize ?? "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.baseMaterial || "-"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">{measurement.length ?? "-"}</td>
                    <td className="px-4 py-3 text-sm font-bold font-mono text-right text-blue-600 dark:text-blue-400">{Number(measurement.custom_fields?.inchMeter || measurement.quantity || 0).toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.surfaceArea || "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.paintSystem || "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{measurement.custom_fields?.remarks || "-"}</td>
                    <td className="px-4 py-3 text-sm font-bold font-mono text-right text-blue-600 dark:text-blue-400">{Number(measurement.quantity || 0).toFixed(3)}</td>
                    {departmentMilestones.map((milestone, msIndex) => <td key={msIndex} className="px-4 py-3 text-xs font-mono text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">{measurement.custom_fields?.milestone_values?.[milestone.mapKey] !== undefined ? Number(measurement.custom_fields.milestone_values[milestone.mapKey]).toFixed(3) : "-"}</td>)}
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEditing(measurement)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => void deleteMeasurement(measurement.id)} disabled={deletingId === measurement.id} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all disabled:opacity-50">{deletingId === measurement.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button></div></td>
                  </tr>
                );
              })}
              {newRowActive && (
                <tr ref={newRowContainerRef} className={`border-t-2 transition-colors ${getRowColor(saveStatus)}`} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void manualNewRowSave(); } if (e.key === "Escape") handleCancelNewRow(); }} onBlur={(e) => { const relatedTarget = e.relatedTarget as HTMLElement | null; if (newRowContainerRef.current && relatedTarget && newRowContainerRef.current.contains(relatedTarget)) return; void performNewRowSave(); }}>
                  <td className="px-4 py-2 text-xs font-bold text-blue-500">{newRowSavedId ? filteredMeasurements.length : filteredMeasurements.length + 1}</td>
                  {renderEditableCells(newRow, updateNewRow, true)}
                  <td className="px-4 py-2"><div className="flex items-center gap-1">{saveStatus === "saving" ? <div className="p-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /></div> : saveStatus === "saved" ? <div className="p-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div> : <button onClick={() => void manualNewRowSave()} disabled={!hasRequiredValues(newRow)} className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-all"><CheckCircle2 className="w-3.5 h-3.5" /></button>}<button onClick={handleCancelNewRow} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"><X className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              )}
            </tbody>
            <tfoot><tr className="bg-slate-50 dark:bg-slate-800/30 border-t-2 border-slate-200 dark:border-slate-700 font-bold"><td colSpan={13} className="px-4 py-3 text-sm font-extrabold text-slate-900 dark:text-white">Subtotal · {areaFilter}</td><td className="px-4 py-3 text-sm font-black text-right text-blue-600 dark:text-blue-400 font-mono">{filteredTotal.toFixed(3)} {item?.unit || "Unit"}</td>{departmentMilestones.map((milestone, index) => { const total = filteredMeasurements.reduce((sum, measurement) => sum + Number(measurement.custom_fields?.milestone_values?.[milestone.mapKey] || 0), 0); return <td key={index} className="px-4 py-3 text-xs font-bold font-mono text-right text-slate-600 dark:text-slate-400">{total > 0 ? total.toFixed(3) : "-"}</td>; })}<td className="px-4 py-3"></td></tr></tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><Weight className="w-6 h-6" /></div><div><div className="flex items-baseline gap-1.5"><span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{item?.unit || "Unit"}</span></div><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">{totalMeasured.toFixed(3)}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Measured Quantity</p></div></div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600"><TrendingUp className="w-6 h-6" /></div><div><div className="flex items-baseline gap-1.5"><span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">%</span></div><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">{progressPercent.toFixed(0)}%</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Overall Milestone Progress</p></div></div>
      </div>

      <AnimatePresence>{showToast && (<motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-8 right-8 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-4 flex items-center gap-4 min-w-[300px] overflow-hidden"><div className={`absolute top-0 left-0 w-1 h-full ${toastType === "success" ? "bg-emerald-500" : "bg-red-500"}`} /><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toastType === "success" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-red-50 dark:bg-red-900/20 text-red-600"}`}>{toastType === "success" ? <CheckCircle2 className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}</div><div><p className="font-extrabold text-slate-900 dark:text-white">{toastMessage}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{toastType === "success" ? "Done" : "Please retry"}</p></div></motion.div>)}</AnimatePresence>
    </div>
  );
}
