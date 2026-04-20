"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Hash,
  IndianRupee,
  Loader2,
  PackageCheck,
  Printer,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api-config";
import { exportRABillToExcel } from "@/lib/ra-bill-export";
import { generateSegmentedBillPDF } from "@/lib/pdf-generator";
import { getStoredRABill, getStoredRABills, type StoredRABill } from "@/lib/ra-bill-history";

type GroupedBills = {
  orderId: string;
  orderNumber: string;
  orderTitle: string;
  bills: StoredRABill[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatQty(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function getDisplayValue(row: NonNullable<StoredRABill["measurementItems"]>[number]["measurements"][number], key: string) {
  if (key === "__length") return row.length === null || row.length === undefined ? "-" : formatQty(Number(row.length));
  if (key === "__breadth") return row.breadth === null || row.breadth === undefined ? "-" : formatQty(Number(row.breadth));
  if (key === "__depth") return row.depth === null || row.depth === undefined ? "-" : formatQty(Number(row.depth));
  if (key === "__location") return row.locationDescription || "-";

  const value = row.customFields?.[key];
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "number") return formatQty(value);
  return String(value);
}

function getMeasurementColumns(department: string) {
  if (department === "Piping-LHS") {
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

  if (department === "Piping-Spool Status") {
    return [
      ["Area", "area"],
      ["Drg No", "drawingNo"],
      ["Rev", "revNo"],
      ["Sheet", "sheetNo"],
      ["Spool", "spoolNo"],
      ["Size", "lineSize"],
      ["Mat", "baseMaterial"],
      ["Len", "__length"],
      ["InchMtr", "inchMeter"],
      ["SurfArea", "surfaceArea"],
      ["Paint", "paintSystem"],
      ["Rem", "remarks"],
    ];
  }

  if (department === "Piping Insulation") {
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

  if (department === "Equipment Insulation") {
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

export default function BillHistoryPage() {
  const [bills, setBills] = useState<StoredRABill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<StoredRABill | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrder, setFilterOrder] = useState("All Orders");

  useEffect(() => {
    const loadBills = async () => {
      const localBills = getStoredRABills();
      setBills(localBills);

      try {
        const sessionString = localStorage.getItem("session");
        const token = sessionString && sessionString !== "null" ? JSON.parse(sessionString)?.access_token : null;
        if (!token) return;

        const response = await fetch(`${API_BASE}/bills/history`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.bills)) {
          setBills(data.bills);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadBills();
  }, []);

  const groupedBills = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = bills.filter((bill) => {
      const matchesFilter = filterOrder === "All Orders" || bill.orderNumber === filterOrder;
      const matchesQuery =
        !normalizedQuery ||
        bill.raNumber.toLowerCase().includes(normalizedQuery) ||
        bill.projectName.toLowerCase().includes(normalizedQuery) ||
        bill.orderNumber.toLowerCase().includes(normalizedQuery) ||
        bill.orderTitle.toLowerCase().includes(normalizedQuery) ||
        bill.clientName.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });

    const groups = new Map<string, GroupedBills>();

    filtered.forEach((bill) => {
      const key = bill.orderId || bill.orderNumber;
      const existing = groups.get(key) || {
        orderId: bill.orderId,
        orderNumber: bill.orderNumber,
        orderTitle: bill.orderTitle,
        bills: [],
      };

      existing.bills.push(bill);
      groups.set(key, existing);
    });

    return Array.from(groups.values()).sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
  }, [bills, filterOrder, searchQuery]);

  const orderOptions = useMemo(
    () => ["All Orders", ...Array.from(new Set(bills.map((bill) => bill.orderNumber))).sort()],
    [bills],
  );

  const totalGenerated = groupedBills.reduce((sum, group) => sum + group.bills.length, 0);

  const openBill = async (bill: StoredRABill) => {
    const localDetail = getStoredRABill(bill.orderId, bill.raNumber);
    if (localDetail?.lineItems?.length) {
      setSelectedBill(localDetail);
      return;
    }

    setSelectedBill(bill);
    setIsLoadingDetail(true);

    try {
      const sessionString = localStorage.getItem("session");
      const token = sessionString && sessionString !== "null" ? JSON.parse(sessionString)?.access_token : null;
      if (!token) return;

      const response = await fetch(`${API_BASE}/bills/history/${bill.orderId}/${encodeURIComponent(bill.raNumber)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) return;
      const data = await response.json();
      if (data.bill) {
        setSelectedBill(data.bill);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const exportBillPdf = async (bill: StoredRABill) => {
    const safeProjectName = (bill.projectName || "Project").replace(/[^a-z0-9]+/gi, "_");
    await generateSegmentedBillPDF(["history-bill-abstract"], {
      filename: `${bill.raNumber}_${safeProjectName}_${new Date(bill.generatedAt).toISOString().split("T")[0]}.pdf`,
      orientation: "landscape",
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Bill History</h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide">View and print all previously generated RA bills</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
        <div className="relative flex-1 w-full group">
          <input
            type="text"
            placeholder="Search projects, orders, or clients..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-5 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="h-[58px] px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all shadow-sm group">
            <Filter className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          <div className="relative h-[58px] flex-1 md:flex-none">
            <select
              value={filterOrder}
              onChange={(event) => setFilterOrder(event.target.value)}
              className="appearance-none h-full min-w-[220px] pl-6 pr-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer shadow-sm text-sm"
            >
              {orderOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap pl-2">
            {isLoading ? "Loading..." : `${totalGenerated} Bills Generated`}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-10 pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <FileText className="absolute inset-0 m-auto w-6 h-6 text-blue-600/50" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">Loading Bill History</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Compiling previous RA bills...</p>
            </div>
          </div>
        ) : groupedBills.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">No Bills Found</h3>
            <p className="text-slate-500 font-bold max-w-sm mx-auto text-sm leading-relaxed">
              RA bills will appear here once they are generated from the order items page.
            </p>
          </div>
        ) : (
          groupedBills.map((group) => (
            <motion.div
              key={group.orderId || group.orderNumber}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 px-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-800 shadow-sm">
                  <Hash className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Order {group.orderNumber}</h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">{group.orderTitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {group.bills.map((bill) => {
                  const entryCount = bill.lineItems?.length || 1;

                  return (
                    <div
                      key={bill.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.75rem] p-6 shadow-sm hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{bill.raNumber}</h3>
                          <div className="flex items-center gap-2 mt-3 text-slate-500">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">{formatDateTime(bill.generatedAt)}</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800">
                          Generated
                        </span>
                      </div>

                      <div className="mt-5 space-y-0">
                        <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[15px] text-slate-500">Entries</span>
                          <span className="text-[15px] font-black text-slate-900 dark:text-white">{entryCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[15px] text-slate-500">Total Weight</span>
                          <span className="text-[15px] font-black text-slate-900 dark:text-white">{formatQty(bill.totalQty)} {bill.unit}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[15px] text-slate-500">Amount</span>
                          <span className="text-[15px] font-black text-blue-700">{formatMoney(bill.totalAmount)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => void openBill(bill)}
                        className="mt-6 w-full rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-5 py-3 text-base font-black text-slate-900 dark:text-white transition-colors"
                      >
                        View Bill Details
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setSelectedBill(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="relative z-10 flex h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[30px] bg-slate-100 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-8 py-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Bill Details</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{selectedBill.raNumber}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {selectedBill.projectName} | Order #{selectedBill.orderNumber}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition-colors hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
                {isLoadingDetail ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading bill details...
                    </div>
                  </div>
                ) : (
                  <div>
                    <section id="history-bill-abstract" className="space-y-6">
                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Project</p>
                            <p className="mt-2 text-base font-black text-slate-900">{selectedBill.projectName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Client</p>
                            <p className="mt-2 text-base font-black text-slate-900">{selectedBill.clientName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Order</p>
                            <p className="mt-2 text-base font-black text-slate-900">{selectedBill.orderNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Generated On</p>
                            <p className="mt-2 text-base font-black text-slate-900">{formatDateTime(selectedBill.generatedAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-left text-sm font-black">PO Sr No</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-left text-sm font-black">Item Code</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-left text-sm font-black">Item Description</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-center text-sm font-black">Unit</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-right text-sm font-black">Quantity</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-left text-sm font-black">Bill Break Up</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-center text-sm font-black">Break up %</th>
                              <th rowSpan={2} className="border border-slate-200 px-3 py-3 text-right text-sm font-black">Unit Rate</th>
                              <th colSpan={2} className="border border-slate-200 px-3 py-2 text-center text-sm font-black">Previous Bill</th>
                              <th colSpan={2} className="border border-slate-200 px-3 py-2 text-center text-sm font-black">This Bill</th>
                              <th colSpan={2} className="border border-slate-200 px-3 py-2 text-center text-sm font-black">Cumm. Bill</th>
                            </tr>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-200 px-3 py-2 text-right text-sm font-black">Certified Qty</th>
                              <th className="border border-slate-200 px-3 py-2 text-right text-sm font-black">Amount</th>
                              <th className="border border-slate-200 px-3 py-2 text-right text-sm font-black">Certified Qty</th>
                              <th className="border border-slate-200 px-3 py-2 text-right text-sm font-black">Amount</th>
                              <th className="border border-slate-200 px-3 py-2 text-right text-sm font-black">Certified Qty</th>
                              <th className="border border-slate-200 px-3 py-2 text-right text-sm font-black">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedBill.lineItems || []).map((line, index) => (
                              <tr key={`${line.itemId}-${line.milestoneKey}`}>
                                <td className="border border-slate-200 px-3 py-3 text-sm">{index + 1}</td>
                                <td className="border border-slate-200 px-3 py-3 text-sm">{line.itemCode}</td>
                                <td className="border border-slate-200 px-3 py-3 text-sm">{line.description}</td>
                                <td className="border border-slate-200 px-3 py-3 text-center text-sm">{line.unit}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm">{formatQty(line.quantity)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-sm">{line.milestoneName}</td>
                                <td className="border border-slate-200 px-3 py-3 text-center text-sm">{line.milestonePercentage}%</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm">{formatMoney(line.rate)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm">{formatQty(line.previousQty)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm">{formatMoney(line.previousAmount)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm font-black">{formatQty(line.currentQty)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm font-black">{formatMoney(line.currentAmount)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm">{formatQty(line.cumulativeQty)}</td>
                                <td className="border border-slate-200 px-3 py-3 text-right text-sm">{formatMoney(line.cumulativeAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-2xl font-black text-slate-900">Measurement Sheet Summary</h3>
                        <div className="mt-6 space-y-6">
                          {(selectedBill.measurementItems || []).map((item, itemIndex) => {
                            const columns = getMeasurementColumns(item.department);
                            const milestoneHeaders = Array.from(
                              new Map(
                                item.measurements.flatMap((row) =>
                                  row.raBillMilestones.map((entry) => [entry.milestoneKey, entry]),
                                ),
                              ).values(),
                            );
                            const subtotal = item.measurements.reduce(
                              (sum, row) => sum + row.raBillMilestones.reduce((inner, entry) => inner + Number(entry.qty || 0), 0),
                              0,
                            );

                            return (
                              <div key={item.itemId} className="overflow-hidden rounded-[24px] border border-slate-900/80">
                                <div className="border-b border-slate-900/80 bg-slate-50 px-5 py-4">
                                  <p className="text-2xl font-black text-slate-900">
                                    Item {itemIndex + 1}: {item.itemCode} - {item.description}
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-500">
                                    Department: {item.department} | Unit: {item.unit}
                                  </p>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100">
                                        <th className="border border-slate-900/80 px-3 py-3 text-center text-sm font-black">Sr.</th>
                                        {columns.map(([label]) => (
                                          <th key={label} className="border border-slate-900/80 px-3 py-3 text-center text-sm font-black">{label}</th>
                                        ))}
                                        <th className="border border-slate-900/80 px-3 py-3 text-right text-sm font-black">100% Qty</th>
                                        {milestoneHeaders.map((entry) => (
                                          <th key={entry.milestoneKey} className="border border-slate-900/80 px-3 py-3 text-center text-sm font-black">
                                            {entry.percentage}% {entry.milestoneName}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.measurements.map((row, rowIndex) => (
                                        <tr key={row.id}>
                                          <td className="border border-slate-900/80 px-3 py-3 text-center">{rowIndex + 1}</td>
                                          {columns.map(([label, key]) => (
                                            <td key={`${row.id}-${label}`} className="border border-slate-900/80 px-3 py-3 text-center">
                                              {getDisplayValue(row, key)}
                                            </td>
                                          ))}
                                          <td className="border border-slate-900/80 px-3 py-3 text-right">{formatQty(Number(row.quantity || 0))}</td>
                                          {milestoneHeaders.map((entry) => {
                                            const milestoneQty = row.raBillMilestones.find((value) => value.milestoneKey === entry.milestoneKey)?.qty || 0;
                                            return (
                                              <td key={entry.milestoneKey} className="border border-slate-900/80 px-3 py-3 text-center font-bold">
                                                {milestoneQty > 0 ? formatQty(milestoneQty) : "-"}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                      <tr className="bg-slate-100">
                                        <td colSpan={columns.length + 2} className="border border-slate-900/80 px-3 py-3 text-left text-lg font-black text-slate-900">
                                          SUBTOTAL - {item.itemCode}
                                        </td>
                                        <td colSpan={Math.max(1, milestoneHeaders.length)} className="border border-slate-900/80 px-3 py-3 text-center text-lg font-black text-slate-900">
                                          {subtotal > 0 ? formatQty(subtotal) : "-"}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}

                          <div className="rounded-[24px] border border-slate-900/80 bg-slate-50 p-5">
                            <h4 className="text-2xl font-black text-slate-900">GRAND TOTAL - ALL ITEMS</h4>
                            <div className="mt-4 flex flex-wrap gap-12 text-lg">
                              <p className="text-slate-500">
                                Total Weight: <span className="font-black text-slate-900">{formatQty(selectedBill.totalQty)} {selectedBill.unit}</span>
                              </p>
                              <p className="text-slate-500">
                                Bill Amount: <span className="font-black text-slate-900">{formatMoney(selectedBill.totalAmount)}</span>
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xl font-black text-slate-900">Generated on: {formatDateTime(selectedBill.generatedAt)}</p>
                            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-lg text-amber-900">
                              <span className="font-black">Note:</span> This is a historical record of {selectedBill.raNumber}. All quantities shown were locked at the time of generation and cannot be modified.
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section id="history-bill-measurements" className="hidden">
                      <div className="mb-6">
                        <h3 className="text-2xl font-black text-slate-900">Measurement Sheet Summary</h3>
                      </div>
                      {(selectedBill.measurementItems || []).map((item, itemIndex) => {
                        const columns = getMeasurementColumns(item.department);
                        const milestoneHeaders = Array.from(
                          new Map(
                            item.measurements.flatMap((row) =>
                              row.raBillMilestones.map((entry) => [entry.milestoneKey, entry]),
                            ),
                          ).values(),
                        );

                        return (
                          <div key={item.itemId} className={itemIndex > 0 ? "mt-8" : ""}>
                            <div className="mb-2">
                              <p className="text-lg font-black text-slate-900">{item.itemCode} - {item.description}</p>
                            </div>
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className="border border-slate-900 px-2 py-2 text-center">Sr.</th>
                                  {columns.map(([label]) => (
                                    <th key={label} className="border border-slate-900 px-2 py-2 text-center">{label}</th>
                                  ))}
                                  <th className="border border-slate-900 px-2 py-2 text-right">Qty</th>
                                  {milestoneHeaders.map((entry) => (
                                    <th key={entry.milestoneKey} className="border border-slate-900 px-2 py-2 text-center">
                                      {entry.percentage}% {entry.milestoneName}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {item.measurements.map((row, rowIndex) => (
                                  <tr key={row.id}>
                                    <td className="border border-slate-900 px-2 py-2 text-center">{rowIndex + 1}</td>
                                    {columns.map(([label, key]) => (
                                      <td key={`${row.id}-${label}`} className="border border-slate-900 px-2 py-2 text-center">
                                        {getDisplayValue(row, key)}
                                      </td>
                                    ))}
                                    <td className="border border-slate-900 px-2 py-2 text-right">{formatQty(Number(row.quantity || 0))}</td>
                                    {milestoneHeaders.map((entry) => {
                                      const milestoneQty = row.raBillMilestones.find((value) => value.milestoneKey === entry.milestoneKey)?.qty || 0;
                                      return (
                                        <td key={entry.milestoneKey} className="border border-slate-900 px-2 py-2 text-center">
                                          {milestoneQty > 0 ? formatQty(milestoneQty) : "-"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </section>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-8 py-5">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={() => selectedBill && exportRABillToExcel(selectedBill)}
                    disabled={isLoadingDetail}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export to Excel
                  </button>
                  <button
                    onClick={() => selectedBill && void exportBillPdf(selectedBill)}
                    disabled={isLoadingDetail}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    Print / Save PDF
                  </button>
                  <button
                    onClick={() => setSelectedBill(null)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-600"
                  >
                    <Download className="h-4 w-4" />
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
