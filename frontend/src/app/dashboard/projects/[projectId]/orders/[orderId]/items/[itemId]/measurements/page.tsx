"use client";

import { useEffect, useState } from "react";
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
  Ruler
} from "lucide-react";
import { calculateStructureWeight } from "@/lib/calculations/structure";

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
};

type MeasurementRow = {
  description: string;
  structure_type?: string;
  mark?: string;
  length?: number;
  width?: number;
  thickness?: number;
  qty?: number;
  unit_weight?: number;
  total_weight?: number;
};

const API_BASE = "http://localhost:5000/api";

export default function MeasurementSheetPage() {
  const params = useParams<{ projectId: string; orderId: string; itemId: string }>();
  const router = useRouter();

  const projectId = params?.projectId as string;
  const orderId = params?.orderId as string;
  const itemId = params?.itemId as string;

  const [item, setItem] = useState<Item | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New Row State
  const [newRow, setNewRow] = useState<MeasurementRow>({
    description: "",
    structure_type: "",
    mark: "",
    length: undefined,
    width: undefined,
    thickness: undefined,
    qty: undefined,
    unit_weight: undefined,
    total_weight: 0
  });

  useEffect(() => {
    if (!projectId || !orderId || !itemId) return;
    if (projectId.startsWith("[")) return;
    void loadData();
  }, [projectId, orderId, itemId]);

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
      // Fetch Item details to get department
      const itemsRes = await fetch(`${API_BASE}/items/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!itemsRes.ok) throw new Error("Failed to load item API");
      const iData = await itemsRes.json();
      const currentItem = (iData.items || []).find((i: any) => i.id === itemId);
      if (currentItem) setItem(currentItem);

      // Fetch specific measurements
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
      alert("Failed to load: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Recalculate row weight whenever properties change
  useEffect(() => {
    if (item?.department === "Structure") {
      const calculatedWeight = calculateStructureWeight(
        Number(newRow.length || 0),
        Number(newRow.width || 1), // Optional thickness/width usually default to 1 if not used in some contexts, but let's strictly follow the exact formula. The helper does handle this.
        Number(newRow.thickness || 1),
        Number(newRow.qty || 0),
        Number(newRow.unit_weight || 0)
      );
      setNewRow(prev => ({ ...prev, total_weight: calculatedWeight }));
    }
  }, [newRow.length, newRow.width, newRow.thickness, newRow.qty, newRow.unit_weight, item?.department]);

  const handleAddField = (field: keyof MeasurementRow, value: any) => {
    setNewRow({ ...newRow, [field]: value });
  };

  const saveMeasurementRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    if (!newRow.description) {
      return alert("Location / Description is required");
    }

    setIsSaving(true);
    try {
      // the measurement endpoint takes quantity as the calculated final value, and custom_fields for the rest
      const payload = {
        location_description: newRow.description,
        length: newRow.length || 0,
        breadth: newRow.width || 0, // Using breadth col for width loosely, but let's just store in custom_fields
        depth: newRow.thickness || 0,
        quantity: newRow.total_weight || 0,
        custom_fields: {
          structure_type: newRow.structure_type,
          mark: newRow.mark,
          unit_weight: newRow.unit_weight,
          width: newRow.width,
          thickness: newRow.thickness,
          length: newRow.length,
          qty: newRow.qty
        }
      };

      const response = await fetch(`${API_BASE}/measurements/item/${itemId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to save measurement");
      }

      const { measurement } = await response.json();
      setMeasurements([...measurements, measurement]);

      setNewRow({
        description: "",
        structure_type: "",
        mark: "",
        length: undefined,
        width: undefined,
        thickness: undefined,
        qty: undefined,
        unit_weight: undefined,
        total_weight: 0
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isStructure = item?.department === "Structure";

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href={`/dashboard/projects/${projectId}/orders/${orderId}/items`}
          className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          Back to Items
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-slate-900 dark:text-white">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Measurement Sheet
          </h1>
          <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
            <span>Code: {item?.item_code || "---"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
            <span className="text-blue-600 dark:text-blue-400">{item?.department || "General"}</span>
          </div>
          {item?.description && (
             <p className="max-w-2xl text-sm font-semibold text-slate-500 mt-2">{item.description}</p>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8 text-slate-900 dark:text-white font-extrabold text-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
            <Ruler className="w-5 h-5" />
          </div>
          <h2>Record New Entry</h2>
        </div>

        <form onSubmit={saveMeasurementRow} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Description</label>
                <input 
                   required
                   type="text" 
                   value={newRow.description}
                   onChange={e => handleAddField("description", e.target.value)}
                   className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold placeholder:text-slate-300 text-sm" 
                   placeholder="e.g. Ground Floor Grid A"
                />
             </div>

            {isStructure && (
              <>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Struc. Type</label>
                    <input 
                       type="text" 
                       value={newRow.structure_type || ""}
                       onChange={e => handleAddField("structure_type", e.target.value)}
                       className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold placeholder:text-slate-300 text-sm" 
                       placeholder="e.g. Beam"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Mark</label>
                    <input 
                       type="text" 
                       value={newRow.mark || ""}
                       onChange={e => handleAddField("mark", e.target.value)}
                       className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold placeholder:text-slate-300 text-sm" 
                       placeholder="e.g. BM-1"
                    />
                 </div>
              </>
            )}
          </div>

          {isStructure && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 pt-4">
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nos</label>
                  <input type="number" min="0" step="1" value={newRow.qty ?? ""} onChange={e => handleAddField("qty", e.target.value ? Number(e.target.value) : undefined)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold" />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Length</label>
                  <input type="number" min="0" step="0.001" value={newRow.length ?? ""} onChange={e => handleAddField("length", e.target.value ? Number(e.target.value) : undefined)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold" />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Width</label>
                  <input type="number" min="0" step="0.001" value={newRow.width ?? ""} onChange={e => handleAddField("width", e.target.value ? Number(e.target.value) : undefined)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold" />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Thickness</label>
                  <input type="number" min="0" step="0.001" value={newRow.thickness ?? ""} onChange={e => handleAddField("thickness", e.target.value ? Number(e.target.value) : undefined)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:outline-none font-bold" />
              </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest pl-1">Unit Weight</label>
                  <input type="number" min="0" step="0.001" value={newRow.unit_weight ?? ""} onChange={e => handleAddField("unit_weight", e.target.value ? Number(e.target.value) : undefined)} className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-100 rounded-2xl focus:border-blue-500 focus:outline-none font-bold" />
              </div>

               <div className="space-y-2 flex flex-col justify-end">
                 <div className="h-[46px] flex flex-col justify-center px-4 bg-slate-900 dark:bg-black rounded-2xl text-white">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Weight</span>
                    <span className="font-mono text-lg leading-none">{Number(newRow.total_weight || 0).toLocaleString("en-IN")}</span>
                 </div>
               </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end">
             <button 
               type="submit" 
               disabled={isSaving}
               className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
             >
               {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               Save Entry
             </button>
          </div>
        </form>
      </div>

      {/* Historical Measurements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
         <div className="p-8 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white mb-1">Previous Entries</h3>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">History</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Description</th>
                     {isStructure && (
                        <>
                           <th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Type</th>
                           <th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Nos</th>
                           <th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">L</th>
                           <th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">W</th>
                           <th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">T</th>
                           <th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Unit Wt</th>
                        </>
                     )}
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Calculated Total</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                  {measurements.length === 0 ? (
                     <tr>
                        <td colSpan={10} className="px-8 py-16 text-center text-slate-400 font-bold">
                           No measurements recorded yet.
                        </td>
                     </tr>
                  ) : (
                     measurements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                           <td className="px-8 py-5 text-sm font-bold text-slate-900 dark:text-white">
                              {m.location_description}
                              {isStructure && m.custom_fields?.mark && (
                                 <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-[10px] text-blue-600 dark:text-blue-400 uppercase">{m.custom_fields.mark}</span>
                              )}
                           </td>
                           {isStructure && (
                              <>
                                 <td className="px-6 py-5 text-xs font-semibold text-slate-600 dark:text-slate-300">{m.custom_fields?.structure_type || "-"}</td>
                                 <td className="px-6 py-5 text-xs font-mono text-slate-500">{m.custom_fields?.qty ?? "-"}</td>
                                 <td className="px-6 py-5 text-xs font-mono text-slate-500">{m.custom_fields?.length ?? "-"}</td>
                                 <td className="px-6 py-5 text-xs font-mono text-slate-500">{m.custom_fields?.width ?? "-"}</td>
                                 <td className="px-6 py-5 text-xs font-mono text-slate-500">{m.custom_fields?.thickness ?? "-"}</td>
                                 <td className="px-6 py-5 text-xs font-mono text-slate-500">{m.custom_fields?.unit_weight ?? "-"}</td>
                              </>
                           )}
                           <td className="px-8 py-5 text-sm font-black text-right font-mono text-blue-600 dark:text-blue-400">
                              {Number(m.quantity).toLocaleString("en-IN", { minimumFractionDigits: 3 })}
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
