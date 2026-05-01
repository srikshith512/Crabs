"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileText, Loader2, Lock, Printer, TriangleAlert, X } from "lucide-react";
import { API_BASE } from "@/lib/api-config";
import { generateSegmentedBillPDF } from "@/lib/pdf-generator";
import { exportRABillToExcel } from "@/lib/ra-bill-export";
import {
  saveStoredRABill,
  type StoredRABill,
  type StoredRABillMeasurementItem,
} from "@/lib/ra-bill-history";

type Project = { id: string; name: string; client_name?: string };
type Order = { id: string; order_code: string; title: string };
type Milestone = { id?: string; name: string; percentage: number };

type RALock = {
  raNumber: string;
  milestoneKey: string;
  milestoneName: string;
  percentage: number;
  qty: number;
  amount: number;
  lockedAt: string;
};

type Measurement = {
  id: string;
  item_id: string;
  location_description?: string;
  length?: number | null;
  breadth?: number | null;
  depth?: number | null;
  quantity?: number | null;
  custom_fields?: Record<string, any> & {
    milestone_values?: Record<string, number>;
    ra_locks?: RALock[];
  };
};

type Item = {
  id: string;
  item_code: string;
  description: string;
  short_description?: string;
  unit: string;
  department: string;
  quantity: number;
  rate: number;
  milestones?: Milestone[];
  measurements?: Measurement[];
};

type BillLine = {
  item: Item;
  milestone: Milestone;
  milestoneKey: string;
  previousQty: number;
  currentQty: number;
  cumulativeQty: number;
  previousAmount: number;
  currentAmount: number;
  cumulativeAmount: number;
};

type LockCandidate = {
  item: Item;
  measurement: Measurement;
  milestone: Milestone;
  milestoneKey: string;
  qtyToLock: number;
};

type ToastState = {
  type: "success" | "error";
  title: string;
  subtitle: string;
};

type Props = {
  project: Project | null;
  order: Order | null;
  items: Item[];
  onGenerated?: () => void;
};

const qtyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatQty(value: number) {
  return qtyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatMoney(value: number) {
  return `\u20B9${moneyFormatter.format(Number.isFinite(value) ? value : 0)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMilestoneKey(item: Item, milestone: Milestone) {
  return `item_${item.id}_ms_${milestone.name}`;
}

function getMilestoneValue(measurement: Measurement, key: string) {
  return Number(measurement.custom_fields?.milestone_values?.[key] || 0);
}

function getLocks(measurement: Measurement) {
  return Array.isArray(measurement.custom_fields?.ra_locks) ? measurement.custom_fields!.ra_locks! : [];
}

function hasPositiveMeasurement(measurement: Measurement) {
  return Number(measurement.quantity || 0) > 0;
}

function getExistingRANumbers(items: Item[]) {
  const numbers = new Set<string>();
  items.forEach((item) => {
    (item.measurements || []).forEach((measurement) => {
      getLocks(measurement).forEach((lock) => {
        if (lock.raNumber) numbers.add(lock.raNumber);
      });
    });
  });
  return Array.from(numbers).sort();
}

function getDisplayValue(measurement: Measurement | StoredRABillMeasurementItem["measurements"][number], key: string) {
  const isLiveMeasurement = "custom_fields" in measurement;
  const locationValue = isLiveMeasurement
    ? measurement.location_description
    : (measurement as StoredRABillMeasurementItem["measurements"][number]).locationDescription;
  const source = isLiveMeasurement
    ? measurement.custom_fields
    : (measurement as StoredRABillMeasurementItem["measurements"][number]).customFields;

  if (key === "__length") return measurement.length === null || measurement.length === undefined ? "-" : formatQty(Number(measurement.length));
  if (key === "__breadth") return measurement.breadth === null || measurement.breadth === undefined ? "-" : formatQty(Number(measurement.breadth));
  if (key === "__depth") return measurement.depth === null || measurement.depth === undefined ? "-" : formatQty(Number(measurement.depth));
  if (key === "__location") return locationValue || "-";
  const value = source?.[key];
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "number") return formatQty(value);
  return String(value);
}

function getMeasurementColumns(item: Item | StoredRABillMeasurementItem) {
  if (item.department === "Piping-LHS") {
    return [
      ["Area", "area"],
      ["Doc No.", "doc_no"],
      ["Line No.", "line_no"],
      ["Sheet No.", "sheet_no"],
      ["Rev", "rev"],
      ["MOC", "moc"],
      ["FJ/SJ", "fj_sj"],
      ["Joint No.", "joint_no"],
      ["Spool No.", "spool_no"],
      ["Dia (inch)", "width"],
      ["Thk (mm)", "thickness"],
      ["Schedule", "schedule"],
      ["Joint Type", "joint_type"],
      ["Comp Part 1", "component_part_1"],
      ["Comp Part 2", "component_part_2"],
    ];
  }

  if (item.department === "Piping-Spool Status") {
    return [
      ["Area", "area"],
      ["Drg No.", "drawingNo"],
      ["Rev", "revNo"],
      ["Sheet", "sheetNo"],
      ["Spool", "spoolNo"],
      ["Size", "lineSize"],
      ["Material", "baseMaterial"],
      ["Len", "__length"],
      ["InchMtr", "inchMeter"],
      ["SurfArea", "surfaceArea"],
      ["Paint", "paintSystem"],
      ["Rem", "remarks"],
    ];
  }

  if (item.department === "Piping Insulation") {
    return [
      ["Location", "location"],
      ["Drg No.", "drawingNo"],
      ["Sheet No.", "sheetNo"],
      ["MOC", "moc"],
      ["Line Size", "lineSize"],
      ["Pipe OD", "pipeOD"],
      ["Ins Thk", "insulationThickness"],
      ["Ins Type", "insulationType"],
      ["Temp", "temp"],
      ["Pipe Len", "__length"],
      ["RMT", "rmt"],
      ["Area", "area"],
    ];
  }

  if (item.department === "Equipment Insulation") {
    return [
      ["Eqp No", "equipmentNo"],
      ["Eqp Name", "equipmentName"],
      ["Portion", "portion"],
      ["Position", "position"],
      ["Temp (C)", "temp"],
      ["MOC", "moc"],
      ["Ins Type", "insulationType"],
      ["Thk (mm)", "thickness"],
      ["Ins Dia (m)", "insulatedDia"],
      ["H/L (m)", "__length"],
      ["Shell Area", "shellArea"],
      ["Dish Area", "dishArea"],
      ["Other Area", "otherArea"],
    ];
  }

  return [
    ["Description", "__location"],
    ["Mark No.", "mark"],
    ["Length", "__length"],
    ["Width", "width"],
    ["Thk", "thickness"],
    ["Unit Wt", "unit_weight"],
    ["Qty", "qty"],
  ];
}

export function RABillDialog({ project, order, items, onGenerated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const existingRANumbers = useMemo(() => getExistingRANumbers(items), [items]);
  const nextRANumber = `RA-${String(existingRANumbers.length + 1).padStart(3, "0")}`;

  const { billLines, lockCandidates, billItems, totals, allMeasurements } = useMemo(() => {
    const lines: BillLine[] = [];
    const candidates: LockCandidate[] = [];

    const allMeasurements = items.flatMap(item => item.measurements || []);

    items.forEach((item) => {
      (item.milestones || []).forEach((milestone) => {
        const milestoneKey = getMilestoneKey(item, milestone);
        let previousQty = 0;
        let currentQty = 0;

        allMeasurements.forEach((measurement) => {
          const completedQty = getMilestoneValue(measurement, milestoneKey);
          if (completedQty <= 0) return;

          const previousForMilestone = getLocks(measurement)
            .filter((lock) => lock.milestoneKey === milestoneKey)
            .reduce((sum, lock) => sum + Number(lock.qty || 0), 0);
          const qtyToLock = Math.max(0, completedQty - previousForMilestone);

          previousQty += previousForMilestone;
          currentQty += qtyToLock;

          if (qtyToLock > 0) {
            candidates.push({ item, measurement, milestone, milestoneKey, qtyToLock });
          }
        });

        const milestoneMultiplier = Number(milestone.percentage || 100) / 100;
        const previousAmount = previousQty * Number(item.rate || 0) * milestoneMultiplier;
        const currentAmount = currentQty * Number(item.rate || 0) * milestoneMultiplier;

        if (previousQty > 0 || currentQty > 0) {
          lines.push({
            item,
            milestone,
            milestoneKey,
            previousQty,
            currentQty,
            cumulativeQty: previousQty + currentQty,
            previousAmount,
            currentAmount,
            cumulativeAmount: previousAmount + currentAmount,
          });
        }
      });
    });

    const visibleItems = items.filter((item) =>
      lines.some((line) => line.item.id === item.id && (line.currentQty > 0 || line.previousQty > 0)),
    );

    return {
      billLines: lines,
      lockCandidates: candidates,
      billItems: visibleItems,
      allMeasurements,
      totals: {
        previousQty: lines.reduce((sum, line) => sum + line.previousQty, 0),
        currentQty: lines.reduce((sum, line) => sum + line.currentQty, 0),
        cumulativeQty: lines.reduce((sum, line) => sum + line.cumulativeQty, 0),
        previousAmount: lines.reduce((sum, line) => sum + line.previousAmount, 0),
        currentAmount: lines.reduce((sum, line) => sum + line.currentAmount, 0),
        cumulativeAmount: lines.reduce((sum, line) => sum + line.cumulativeAmount, 0),
      },
    };
  }, [items]);

  const hasCurrentBillData = lockCandidates.length > 0;

  const getToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString || sessionString === "null") return null;
    return JSON.parse(sessionString)?.access_token as string | null;
  };

  const buildBillSnapshot = (raNumber: string, generatedAt: string): StoredRABill => {
    const measurementItemMap = new Map<string, StoredRABillMeasurementItem>();

    lockCandidates.forEach((candidate) => {
      if (candidate.qtyToLock <= 0) return;

      const existingItem = measurementItemMap.get(candidate.item.id) || {
        itemId: candidate.item.id,
        itemCode: candidate.item.item_code,
        description: candidate.item.description,
        department: candidate.item.department,
        unit: candidate.item.unit,
        contractQty: Number(candidate.item.quantity || 0),
        rate: Number(candidate.item.rate || 0),
        measurements: [],
      };

      let existingRow = existingItem.measurements.find((row) => row.id === candidate.measurement.id);
      if (!existingRow) {
        existingRow = {
          id: candidate.measurement.id,
          locationDescription: candidate.measurement.location_description,
          length: candidate.measurement.length ?? null,
          breadth: candidate.measurement.breadth ?? null,
          depth: candidate.measurement.depth ?? null,
          quantity: Number(candidate.measurement.quantity || 0),
          customFields: { ...(candidate.measurement.custom_fields || {}) },
          raBillMilestones: [],
        };
        delete existingRow.customFields?.milestone_values;
        delete existingRow.customFields?.ra_locks;
        existingItem.measurements.push(existingRow);
      }

      existingRow.raBillMilestones.push({
        milestoneKey: candidate.milestoneKey,
        milestoneName: candidate.milestone.name,
        percentage: Number(candidate.milestone.percentage || 0),
        qty: candidate.qtyToLock,
      });

      measurementItemMap.set(candidate.item.id, existingItem);
    });

    return {
      id: `${order?.id || "order"}-${raNumber}`,
      raNumber,
      projectId: project?.id || "",
      projectName: project?.name || "Project",
      clientName: project?.client_name || "-",
      orderId: order?.id || "",
      orderNumber: order?.order_code || "---",
      orderTitle: order?.title || "Order",
      totalAmount: totals.currentAmount,
      totalQty: totals.currentQty,
      unit: billLines[0]?.item.unit || "MT",
      generatedAt,
      totals,
      lineItems: billLines.map((line) => ({
        itemId: line.item.id,
        itemCode: line.item.item_code || "-",
        description: line.item.description,
        unit: line.item.unit,
        quantity: Number(line.item.quantity || 0),
        rate: Number(line.item.rate || 0),
        milestoneKey: line.milestoneKey,
        milestoneName: line.milestone.name,
        milestonePercentage: Number(line.milestone.percentage || 0),
        previousQty: line.previousQty,
        currentQty: line.currentQty,
        cumulativeQty: line.cumulativeQty,
        previousAmount: line.previousAmount,
        currentAmount: line.currentAmount,
        cumulativeAmount: line.cumulativeAmount,
      })),
      measurementItems: Array.from(measurementItemMap.values()),
    };
  };

  const handlePrint = async () => {
    const safeProjectName = (project?.name || "Project").replace(/[^a-z0-9]+/gi, "_");
    try {
      await generateSegmentedBillPDF(["bill-abstract-pdf-section", "bill-measurement-section"], {
        filename: `${nextRANumber}_${safeProjectName}_${new Date().toISOString().split("T")[0]}.pdf`,
        orientation: "landscape",
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      setMessage("PDF generation failed. Please try again.");
    }
  };

  const handleExcelExport = () => {
    try {
      exportRABillToExcel(buildBillSnapshot(nextRANumber, new Date().toISOString()));
    } catch (error) {
      console.error("Excel export failed:", error);
      setMessage("Excel export failed. Please try again.");
    }
  };

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) {
      setMessage("Your session was not found. Please log in again.");
      return;
    }

    if (!hasCurrentBillData) {
      setMessage("No unlocked completed measurement quantities are available for this RA bill.");
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const now = new Date().toISOString();
      const updates = lockCandidates.map((candidate) => {
        const measurement = candidate.measurement;
        const customFields = measurement.custom_fields || {};
        const nextLocks = [
          ...getLocks(measurement),
          {
            raNumber: nextRANumber,
            milestoneKey: candidate.milestoneKey,
            milestoneName: candidate.milestone.name,
            percentage: Number(candidate.milestone.percentage || 0),
            qty: candidate.qtyToLock,
            amount: candidate.qtyToLock * Number(candidate.item.rate || 0),
            lockedAt: now,
          },
        ];

        return fetch(`${API_BASE}/measurements/${measurement.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            location_description: measurement.location_description || "",
            length: measurement.length ?? null,
            breadth: measurement.breadth ?? null,
            depth: measurement.depth ?? null,
            quantity: Number(measurement.quantity || 0),
            custom_fields: { ...customFields, ra_locks: nextLocks },
          }),
        });
      });

      const responses = await Promise.all(updates);
      const failed = responses.find((response) => !response.ok);
      if (failed) {
        const errorData = await failed.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to lock RA bill quantities.");
      }

      saveStoredRABill(buildBillSnapshot(nextRANumber, now));
      setIsOpen(false);
      setToast({
        type: "success",
        title: `${nextRANumber} generated`,
        subtitle: "The bill was locked and added to Bill History.",
      });
      onGenerated?.();
    } catch (error: any) {
      const nextMessage = error.message || "RA bill generation failed.";
      setMessage(nextMessage);
      setToast({
        type: "error",
        title: "RA bill generation failed",
        subtitle: nextMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-950 dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 font-bold rounded-2xl transition-all border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95"
      >
        <FileText className="w-5 h-5 text-blue-600" />
        Generate RA Bill
      </button>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            className="fixed bottom-8 right-8 z-[80] min-w-[320px] max-w-[420px] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
          >
            <div className={`absolute inset-y-0 left-0 w-1.5 ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
            <div className="flex items-center gap-4 pl-2">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {toast.type === "success" ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white">{toast.title}</p>
                <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{toast.subtitle}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 print:static print:bg-white dark:bg-slate-950 print:p-0">
          <div className="relative flex h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-2xl print:h-auto print:max-w-none print:rounded-none print:border-0 print:bg-white dark:bg-slate-950 print:shadow-none">
            <div className="flex items-start justify-between gap-4 bg-slate-100 dark:bg-slate-900 px-8 pb-4 pt-7 print:hidden">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Abstract Sheet - {nextRANumber}</h2>
                <p className="mt-1 text-base font-medium text-slate-500">
                  Running Account Bill for executed quantities
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-all hover:text-slate-900 dark:text-white"
                aria-label="Close RA bill dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-8 pb-48 print:overflow-visible print:p-0">
              {message && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 print:hidden">
                  <AlertCircle className="h-4 w-4" />
                  {message}
                </div>
              )}

              <div id="ra-bill-print-area" className="text-slate-900 dark:text-white print:bg-white dark:bg-slate-950">
                <style jsx global>{`
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #ra-bill-print-area,
                    #ra-bill-print-area * {
                      visibility: visible;
                    }
                    #ra-bill-print-area {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                    }
                    @page {
                      size: A4 landscape;
                      margin: 10mm;
                    }
                    .ra-print-section {
                      break-inside: avoid;
                      page-break-inside: avoid;
                    }
                    .ra-page-break {
                      break-before: page;
                      page-break-before: always;
                    }
                    .ra-table {
                      font-size: 10px;
                    }
                  }
                `}</style>

                <section id="bill-abstract-section" className="ra-print-section">
                  <div className="mb-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
                    <div className="grid grid-cols-1 gap-x-16 gap-y-7 md:grid-cols-2">
                      <div>
                        <p className="text-base font-medium text-slate-500">Project:</p>
                        <p className="text-base font-black text-slate-900 dark:text-white">{project?.name || "Project"}</p>
                      </div>
                      <div>
                        <p className="text-base font-medium text-slate-500">Client:</p>
                        <p className="text-base font-black text-slate-900 dark:text-white">{project?.client_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-base font-medium text-slate-500">Order Number:</p>
                        <p className="text-base font-black text-slate-900 dark:text-white">{order?.order_code || "---"}</p>
                      </div>
                      <div>
                        <p className="text-base font-medium text-slate-500">RA Number:</p>
                        <p className="text-base font-black text-blue-600">{nextRANumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                    <table className="ra-table w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900">
                          <th rowSpan={2} className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-3 text-left text-sm font-black">PO Sr No</th>
                          <th rowSpan={2} className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-3 text-left text-sm font-black">ITEM CODE</th>
                          <th rowSpan={2} className="min-w-[220px] border border-slate-200 dark:border-slate-800 px-3 py-3 text-left text-sm font-black">Item Description</th>
                          <th rowSpan={2} className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-center text-sm font-black">Unit</th>
                          <th rowSpan={2} className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm font-black">Quantity</th>
                          <th rowSpan={2} className="min-w-[210px] border border-slate-200 dark:border-slate-800 px-3 py-3 text-left text-sm font-black">BILL BREAK UP AS PER LOI</th>
                          <th rowSpan={2} className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-3 text-center text-sm font-black">Break up %</th>
                          <th rowSpan={2} className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm font-black">Unit Rate</th>
                          <th colSpan={2} className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-sm font-black">Previous Bill</th>
                          <th colSpan={2} className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-sm font-black">This Bill</th>
                          <th colSpan={2} className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-sm font-black">Cumm. Bill</th>
                          <th rowSpan={2} className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-left text-sm font-black">REMARKS</th>
                        </tr>
                        <tr className="bg-slate-100 dark:bg-slate-900">
                          <th className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-sm font-black">Certified Qty</th>
                          <th className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-sm font-black">Amount</th>
                          <th className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-sm font-black">Certified Qty</th>
                          <th className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-sm font-black">Amount</th>
                          <th className="whitespace-nowrap border border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-sm font-black">Certified Qty</th>
                          <th className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-sm font-black">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billLines.length === 0 ? (
                          <tr>
                            <td colSpan={15} className="border border-slate-200 dark:border-slate-800 px-4 py-8 text-center font-bold text-slate-500">
                              No completed measurement quantities available for RA bill generation.
                            </td>
                          </tr>
                        ) : (
                          billLines.map((line, index) => (
                            <tr key={`${line.item.id}-${line.milestoneKey}`} className="bg-slate-50 dark:bg-slate-900/40">
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm">{index + 1}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm">{line.item.item_code || "-"}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm">{line.item.description}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-center text-sm">{line.item.unit}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatQty(Number(line.item.quantity || 0))}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm">{line.milestone.name}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-center text-sm">{line.milestone.percentage}%</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatMoney(Number(line.item.rate || 0))}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatQty(line.previousQty)}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatMoney(line.previousAmount)}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm font-bold">{formatQty(line.currentQty)}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm font-bold">{formatMoney(line.currentAmount)}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatQty(line.cumulativeQty)}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatMoney(line.cumulativeAmount)}</td>
                              <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm"></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-900 font-black">
                          <td colSpan={8} className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-left text-sm">TOTAL AMOUNT (INR)</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatQty(totals.previousQty)}</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatMoney(totals.previousAmount)}</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatQty(totals.currentQty)}</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatMoney(totals.currentAmount)}</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatQty(totals.cumulativeQty)}</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3 text-right text-sm">{formatMoney(totals.cumulativeAmount)}</td>
                          <td className="border border-slate-200 dark:border-slate-800 px-3 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-7 rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Measurement Sheet Summary</h3>
                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Items Covered</p>
                        <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{billItems.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">This Bill Quantity</p>
                        <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{formatQty(totals.currentQty)} {billLines[0]?.item.unit || "MT"}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">This Bill Amount</p>
                        <p className="mt-3 text-2xl font-black text-emerald-700">{formatMoney(totals.currentAmount)}</p>
                      </div>
                    </div>

                    <div className="mt-8">
                      {billItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                          No measurement rows available for billing.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {billItems.map((item, itemIndex) => {
                            const columns = getMeasurementColumns(item);
                            const itemRows = allMeasurements.filter((measurement) => {
                              if (!hasPositiveMeasurement(measurement)) return false;
                              return lockCandidates.some((candidate) => candidate.item.id === item.id && candidate.measurement.id === measurement.id);
                            });

                            if (itemRows.length === 0) return null;

                            return (
                              <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                      Item {itemIndex + 1}: {item.item_code} - {item.description}
                                    </h4>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                      Department: {item.department} | Unit: {item.unit}
                                    </p>
                                  </div>
                                </div>
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                                  <table className="w-full border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                                        <th className="p-3 text-center font-semibold">Sr.</th>
                                        {columns.map(([label]) => (
                                          <th key={label} className="p-3 text-center font-semibold">{label}</th>
                                        ))}
                                        <th className="p-3 text-right font-semibold">Total ({item.unit})</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {itemRows.map((measurement, rowIndex) => (
                                        <tr key={measurement.id} className="transition-colors hover:bg-slate-50 dark:bg-slate-900/50">
                                          <td className="p-3 text-center text-slate-500">{rowIndex + 1}</td>
                                          {columns.map(([label, key]) => (
                                            <td key={`${measurement.id}-${label}`} className="p-3 text-center text-slate-700 dark:text-slate-200">
                                              {getDisplayValue(measurement, key)}
                                            </td>
                                          ))}
                                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatQty(Number(measurement.quantity || 0))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                      <tr>
                                        <td colSpan={columns.length + 1} className="p-3 text-left font-bold text-slate-700 dark:text-slate-200">
                                          SUBTOTAL - {item.item_code}
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                          {formatQty(itemRows.reduce((sum, r) => sum + Number(r.quantity || 0), 0))}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                          
                          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Grand Total - All Items</h4>
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
                              <div>
                                <span className="text-slate-500">Total {billItems[0]?.unit === 'MT' ? 'Weight' : 'Quantity'}: </span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatQty(totals.currentQty)} {billLines[0]?.item.unit || "MT"}</span>
                              </div>
                              {Object.entries(
                                lockCandidates.reduce((acc, candidate) => {
                                  const name = candidate.milestone.name;
                                  const pct = candidate.milestone.percentage;
                                  const key = `${pct}% Milestone`;
                                  acc[key] = (acc[key] || 0) + candidate.qtyToLock;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([key, qty]) => (
                                <div key={key}>
                                  <span className="text-slate-500">{key}: </span>
                                  <span className="font-bold text-slate-900 dark:text-white">{formatQty(qty as number)} {billLines[0]?.item.unit || "MT"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section id="bill-measurement-section" className="ra-page-break absolute left-[-10000px] top-0 w-[1400px] bg-white dark:bg-slate-950 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black">Measurement Sheet Annexure</h3>
                      <p className="text-xs font-semibold text-slate-500">Only rows with positive completed milestone quantities are included.</p>
                    </div>
                    <div className="text-right text-xs font-bold">
                      <p>{nextRANumber}</p>
                      <p>{order?.order_code || "---"}</p>
                    </div>
                  </div>

                  {billItems.length === 0 ? (
                    <div className="border border-slate-900 dark:border-slate-700 p-8 text-center font-bold text-slate-500">No measurement rows to display.</div>
                  ) : (
                    billItems.map((item, itemIndex) => {
                      const columns = getMeasurementColumns(item);
                      const itemRows = allMeasurements.filter((measurement) => {
                        if (!hasPositiveMeasurement(measurement)) return false;
                        return lockCandidates.some((candidate) => candidate.item.id === item.id && candidate.measurement.id === measurement.id);
                      });

                      if (itemRows.length === 0) return null;

                      return (
                        <div key={item.id} className={itemIndex > 0 ? "ra-print-section mt-8" : "ra-print-section"}>
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="text-sm font-black">
                              {itemIndex + 1}. {item.item_code} - {item.description}
                            </h4>
                            <span className="text-xs font-bold text-slate-500">{item.department}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="ra-table w-full border-collapse border border-slate-900 dark:border-slate-700">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900">
                                  <th className="border border-slate-900 dark:border-slate-700 p-2 text-center">Sr.</th>
                                  {columns.map(([label]) => (
                                    <th key={label} className="border border-slate-900 dark:border-slate-700 p-2 text-center">{label}</th>
                                  ))}
                                  <th className="border border-slate-900 dark:border-slate-700 p-2 text-right">Total ({item.unit})</th>
                                  {(item.milestones || []).map((milestone) => (
                                    <th key={milestone.name} className="border border-slate-900 dark:border-slate-700 p-2 text-center">
                                      {milestone.percentage}% {milestone.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {itemRows.map((measurement, rowIndex) => (
                                  <tr key={measurement.id}>
                                    <td className="border border-slate-900 dark:border-slate-700 p-2 text-center">{rowIndex + 1}</td>
                                    {columns.map(([label, key]) => (
                                      <td key={`${measurement.id}-${label}`} className="border border-slate-900 dark:border-slate-700 p-2 text-center">
                                        {getDisplayValue(measurement, key)}
                                      </td>
                                    ))}
                                    <td className="border border-slate-900 dark:border-slate-700 p-2 text-right font-bold">{formatQty(Number(measurement.quantity || 0))}</td>
                                    {(item.milestones || []).map((milestone) => {
                                      const key = getMilestoneKey(item, milestone);
                                      const qty = lockCandidates
                                        .filter((candidate) => candidate.item.id === item.id && candidate.measurement.id === measurement.id && candidate.milestoneKey === key)
                                        .reduce((sum, candidate) => sum + candidate.qtyToLock, 0);
                                      return (
                                        <td key={key} className="border border-slate-900 dark:border-slate-700 p-2 text-center font-bold">
                                          {qty > 0 ? formatQty(qty) : "-"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })
                  )}
                </section>

                <div className="hidden">
                  <section id="bill-abstract-pdf-section" className="bg-white dark:bg-slate-950 px-5 py-5 text-slate-900 dark:text-white">
                    <div className="mb-4 grid grid-cols-2 gap-x-10 gap-y-5 rounded-[18px] border border-slate-300 bg-white dark:bg-slate-950 p-4">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Project:</p>
                        <p className="mt-1 text-[15px] font-black text-slate-900 dark:text-white">{project?.name || "Project"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Client:</p>
                        <p className="mt-1 text-[15px] font-black text-slate-900 dark:text-white">{project?.client_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Order Number:</p>
                        <p className="mt-1 text-[15px] font-black text-slate-900 dark:text-white">{order?.order_code || "---"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">RA Number:</p>
                        <p className="mt-1 text-[15px] font-black text-blue-600">{nextRANumber}</p>
                      </div>
                    </div>

                    <table className="w-full border-collapse table-fixed text-[9px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900">
                          <th rowSpan={2} className="w-[4.5%] border border-slate-300 px-2 py-2 text-left font-black">PO Sr No</th>
                          <th rowSpan={2} className="w-[6.5%] border border-slate-300 px-2 py-2 text-left font-black">ITEM CODE</th>
                          <th rowSpan={2} className="w-[10.5%] border border-slate-300 px-2 py-2 text-left font-black">Item Description</th>
                          <th rowSpan={2} className="w-[4.5%] border border-slate-300 px-2 py-2 text-center font-black">Unit</th>
                          <th rowSpan={2} className="w-[6%] border border-slate-300 px-2 py-2 text-right font-black">Quantity</th>
                          <th rowSpan={2} className="w-[7%] border border-slate-300 px-2 py-2 text-left font-black">BILL BREAK UP</th>
                          <th rowSpan={2} className="w-[5.5%] border border-slate-300 px-2 py-2 text-center font-black">Break up %</th>
                          <th rowSpan={2} className="w-[5.5%] border border-slate-300 px-2 py-2 text-right font-black">Unit Rate</th>
                          <th colSpan={2} className="w-[13%] border border-slate-300 px-2 py-1.5 text-center font-black">Previous Bill</th>
                          <th colSpan={2} className="w-[13%] border border-slate-300 px-2 py-1.5 text-center font-black">This Bill</th>
                          <th colSpan={2} className="w-[13%] border border-slate-300 px-2 py-1.5 text-center font-black">Cumm. Bill</th>
                          <th rowSpan={2} className="w-[6.5%] border border-slate-300 px-2 py-2 text-left font-black">REMARKS</th>
                        </tr>
                        <tr className="bg-slate-100 dark:bg-slate-900">
                          <th className="border border-slate-300 px-2 py-1.5 text-right font-black">Certified Qty</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right font-black">Amount</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right font-black">Certified Qty</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right font-black">Amount</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right font-black">Certified Qty</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right font-black">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billLines.map((line, index) => (
                          <tr key={`pdf-${line.item.id}-${line.milestoneKey}`}>
                            <td className="border border-slate-300 px-2 py-1.5 align-top">{index + 1}</td>
                            <td className="border border-slate-300 px-2 py-1.5 align-top">{line.item.item_code || "-"}</td>
                            <td className="border border-slate-300 px-2 py-1.5 align-top break-words">{line.item.description}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center align-top">{line.item.unit}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top">{formatQty(Number(line.item.quantity || 0))}</td>
                            <td className="border border-slate-300 px-2 py-1.5 align-top break-words">{line.milestone.name}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-center align-top">{line.milestone.percentage}%</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top">{formatMoney(Number(line.item.rate || 0))}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top">{formatQty(line.previousQty)}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top">{formatMoney(line.previousAmount)}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top font-black">{formatQty(line.currentQty)}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top font-black">{formatMoney(line.currentAmount)}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top">{formatQty(line.cumulativeQty)}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right align-top">{formatMoney(line.cumulativeAmount)}</td>
                            <td className="border border-slate-300 px-2 py-1.5 align-top"></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-900">
                          <td colSpan={8} className="border border-slate-300 px-2 py-2 text-left font-black">TOTAL AMOUNT RS</td>
                          <td className="border border-slate-300 px-2 py-2 text-right font-black">{formatQty(totals.previousQty)}</td>
                          <td className="border border-slate-300 px-2 py-2 text-right font-black">{formatMoney(totals.previousAmount)}</td>
                          <td className="border border-slate-300 px-2 py-2 text-right font-black">{formatQty(totals.currentQty)}</td>
                          <td className="border border-slate-300 px-2 py-2 text-right font-black">{formatMoney(totals.currentAmount)}</td>
                          <td className="border border-slate-300 px-2 py-2 text-right font-black">{formatQty(totals.cumulativeQty)}</td>
                          <td className="border border-slate-300 px-2 py-2 text-right font-black">{formatMoney(totals.cumulativeAmount)}</td>
                          <td className="border border-slate-300 px-2 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="mt-5 rounded-[18px] border border-slate-300 bg-slate-50 dark:bg-slate-900 p-4">
                      <h3 className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">Measurement Sheet Summary</h3>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Items Covered</p>
                          <p className="mt-2 text-[24px] font-black text-slate-900 dark:text-white">{billItems.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">This Bill Quantity</p>
                          <p className="mt-2 text-[24px] font-black text-slate-900 dark:text-white">{formatQty(totals.currentQty)} {billLines[0]?.item.unit || "MT"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">This Bill Amount</p>
                          <p className="mt-2 text-[24px] font-black text-slate-900 dark:text-white">{formatMoney(totals.currentAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="bill-measurement-pdf-section" className="bg-white dark:bg-slate-950 px-8 py-8 text-slate-900 dark:text-white">
                    <div className="mb-6 flex items-center justify-between border-b border-slate-300 pb-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Page Break For PDF</p>
                        <h3 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">Measurement Sheet Summary</h3>
                      </div>
                      <div className="text-right text-sm font-bold text-slate-500">
                        <p>{nextRANumber}</p>
                        <p>{order?.order_code || "---"}</p>
                      </div>
                    </div>

                    {billItems.length === 0 ? (
                      <div className="rounded-2xl border border-slate-300 p-8 text-center font-bold text-slate-500">No measurement rows to display.</div>
                    ) : (
                      billItems.map((item, itemIndex) => {
                        const columns = getMeasurementColumns(item);
                        const itemRows = (item.measurements || []).filter((measurement) => {
                          if (!hasPositiveMeasurement(measurement)) return false;
                          return lockCandidates.some((candidate) => candidate.item.id === item.id && candidate.measurement.id === measurement.id);
                        });

                        const subtotal = itemRows.reduce((sum, measurement) => {
                          return sum + (item.milestones || []).reduce((milestoneSum, milestone) => {
                            const key = getMilestoneKey(item, milestone);
                            const qty = lockCandidates
                              .filter((candidate) => candidate.item.id === item.id && candidate.measurement.id === measurement.id && candidate.milestoneKey === key)
                              .reduce((inner, candidate) => inner + candidate.qtyToLock, 0);
                            return milestoneSum + qty;
                          }, 0);
                        }, 0);

                        return (
                          <div key={`pdf-measure-${item.id}`} className={itemIndex > 0 ? "mt-8 overflow-hidden rounded-[24px] border border-slate-900 dark:border-slate-700/80" : "overflow-hidden rounded-[24px] border border-slate-900 dark:border-slate-700/80"}>
                            <div className="border-b border-slate-900 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 px-5 py-4">
                              <p className="text-2xl font-black text-slate-900 dark:text-white">
                                Item {itemIndex + 1}: {item.item_code} - {item.description}
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-500">
                                Department: {item.department} | Unit: {item.unit}
                              </p>
                            </div>
                            <table className="w-full border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900">
                                  <th className="border border-slate-900 dark:border-slate-700/80 px-2 py-3 text-center font-black">Sr.</th>
                                  {columns.map(([label]) => (
                                    <th key={`pdf-col-${item.id}-${label}`} className="border border-slate-900 dark:border-slate-700/80 px-2 py-3 text-center font-black">{label}</th>
                                  ))}
                                  <th className="border border-slate-900 dark:border-slate-700/80 px-2 py-3 text-right font-black">Total ({item.unit})</th>
                                  {(item.milestones || []).map((milestone) => (
                                    <th key={`pdf-ms-${item.id}-${milestone.name}`} className="border border-slate-900 dark:border-slate-700/80 px-2 py-3 text-center font-black">
                                      {milestone.percentage}% {milestone.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {itemRows.map((measurement, rowIndex) => (
                                  <tr key={`pdf-row-${measurement.id}`}>
                                    <td className="border border-slate-900 dark:border-slate-700/80 px-2 py-2 text-center">{rowIndex + 1}</td>
                                    {columns.map(([label, key]) => (
                                      <td key={`pdf-cell-${measurement.id}-${label}`} className="border border-slate-900 dark:border-slate-700/80 px-2 py-2 text-center">
                                        {getDisplayValue(measurement, key)}
                                      </td>
                                    ))}
                                    <td className="border border-slate-900 dark:border-slate-700/80 px-2 py-2 text-right font-bold">{formatQty(Number(measurement.quantity || 0))}</td>
                                    {(item.milestones || []).map((milestone) => {
                                      const key = getMilestoneKey(item, milestone);
                                      const qty = lockCandidates
                                        .filter((candidate) => candidate.item.id === item.id && candidate.measurement.id === measurement.id && candidate.milestoneKey === key)
                                        .reduce((sum, candidate) => sum + candidate.qtyToLock, 0);
                                      return (
                                        <td key={`pdf-milestone-${measurement.id}-${key}`} className="border border-slate-900 dark:border-slate-700/80 px-2 py-2 text-center font-bold">
                                          {qty > 0 ? formatQty(qty) : "-"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                                <tr className="bg-slate-100 dark:bg-slate-900">
                                  <td colSpan={columns.length + 2} className="border border-slate-900 dark:border-slate-700/80 px-3 py-3 text-left text-lg font-black text-slate-900 dark:text-white">
                                    SUBTOTAL - {item.item_code}
                                  </td>
                                  <td colSpan={Math.max(1, (item.milestones || []).length)} className="border border-slate-900 dark:border-slate-700/80 px-3 py-3 text-center text-lg font-black text-slate-900 dark:text-white">
                                    {subtotal > 0 ? formatQty(subtotal) : "-"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })
                    )}

                    <div className="mt-8 rounded-[24px] border border-slate-900 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 p-5">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white">GRAND TOTAL - ALL ITEMS</h4>
                      <div className="mt-4 flex flex-wrap gap-12 text-lg">
                        <p className="text-slate-500">
                          Total Weight: <span className="font-black text-slate-900 dark:text-white">{formatQty(totals.currentQty)} {billLines[0]?.item.unit || "MT"}</span>
                        </p>
                        <p className="text-slate-500">
                          Bill Amount: <span className="font-black text-slate-900 dark:text-white">{formatMoney(totals.currentAmount)}</span>
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-8 py-5 print:hidden">
              <div className="mb-4 rounded-[22px] border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-white dark:bg-slate-950 p-2 text-amber-600 shadow-sm">
                    <TriangleAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-black">Quantity Locking Notice</p>
                    <p className="mt-1 text-base leading-relaxed text-amber-800">
                      Once you generate this RA bill, all executed quantities shown above will be locked and cannot be modified. These quantities will not appear in future RA bills.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={handleExcelExport}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 text-base font-medium text-slate-900 dark:text-white shadow-sm transition-all hover:bg-slate-50 dark:bg-slate-900"
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  Export to Excel
                </button>
                <button
                  onClick={() => void handlePrint()}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-3 text-base font-medium text-slate-900 dark:text-white shadow-sm transition-all hover:bg-slate-50 dark:bg-slate-900"
                >
                  <Printer className="h-5 w-5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !hasCurrentBillData}
                  className="flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-3 text-base font-black text-white transition-all shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                  Generate & Lock RA Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
