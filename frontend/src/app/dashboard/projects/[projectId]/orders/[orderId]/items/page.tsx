"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Package, 
  Plus, 
  Filter, 
  ChevronDown, 
  X, 
  Loader2, 
  Trash2, 
  Info,
  ChevronRight,
  MoreVertical,
  Search,
  Settings,
  Edit2,
  FileText,
  DollarSign,
  TrendingUp,
  Briefcase,
  Layers,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Project = {
  id: string;
  name: string;
  client_name?: string;
};

type Order = {
  id: string;
  project_id: string;
  order_code: string;
  title: string;
  description: string;
};

type Milestone = {
  id?: string;
  item_id?: string;
  name: string;
  percentage: number;
};

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
  created_at: string;
  milestones?: Milestone[];
};

const API_BASE = "http://localhost:5000/api";

const memoryCache = {
  projects: {} as Record<string, Project>,
  orders: {} as Record<string, Order>,
};

export default function ItemsPage() {
  const params = useParams<{ projectId: string; orderId: string }>();
  const router = useRouter();
  
  const projectId = params?.projectId as string;
  const orderId = params?.orderId as string;

  // Page State
  const [project, setProject] = useState<Project | null>(memoryCache.projects[projectId] || null);
  const [order, setOrder] = useState<Order | null>(memoryCache.orders[orderId] || null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Filter & Sort State
  const [filterDept, setFilterDept] = useState("All Departments");
  const [sortBy, setSortBy] = useState("Description");
  const [sortOrder, setSortOrder] = useState("Ascending");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    item_code: "",
    description: "",
    short_description: "",
    unit: "MT",
    department: "",
    quantity: "",
    rate: ""
  });

  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: "Advance Payment", percentage: 100 }
  ]);

  const departments = [
    "Structure",
    "Piping-LHS",
    "Piping-Spool Status",
    "Piping Insulation",
    "Equipment Insulation",
    "Others"
  ];

  // Derived state for filtering and sorting
  const filteredItems = items
    .filter(item => {
      const matchesDept = filterDept === "All Departments" || item.department === filterDept;
      const matchesSearch = !searchQuery || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    })
    .sort((a, b) => {
      let multiplier = sortOrder === "Ascending" ? 1 : -1;
      if (sortBy === "Description") return a.description.localeCompare(b.description) * multiplier;
      if (sortBy === "Amount") return ((a.quantity * a.rate) - (b.quantity * b.rate)) * multiplier;
      if (sortBy === "Department") return a.department.localeCompare(b.department) * multiplier;
      return 0;
    });

  const summaryStats = {
    totalItems: items.length,
    totalAmount: items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    departments: new Set(items.map(item => item.department)).size,
    averageAmount: items.length > 0 ? items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) / items.length : 0
  };

  useEffect(() => {
    if (!projectId || !orderId) return;
    
    // Prevent fetching if params are literal placeholder strings (common in some Next.js versions/builds)
    if (projectId.startsWith("[") || orderId.startsWith("[")) return;

    void loadData();
  }, [projectId, orderId]);

  const getSessionToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString) {
      router.push("/login");
      return null;
    }
    const session = JSON.parse(sessionString);
    return session.access_token as string;
  };

  const loadData = async (silent = false) => {
    const token = getSessionToken();
    if (!token) return;

    if (!silent) setIsLoading(true);

    try {
      const [projectRes, orderRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        }),
        fetch(`${API_BASE}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        }),
        fetch(`${API_BASE}/items/order/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        }),
      ]);

      // Check for auth errors
      if (projectRes.status === 401 || orderRes.status === 401 || itemsRes.status === 401) {
        localStorage.removeItem("session");
        router.push("/login");
        return;
      }

      // Helper to parse JSON safely with logging
      const safeParse = async (res: Response, name: string) => {
        if (!res.ok) {
          const text = await res.text();
          console.error(`Error fetching ${name}: Status ${res.status}`, text.substring(0, 200));
          throw new Error(`Failed to fetch ${name}: ${res.statusText}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error(`Error: ${name} returned non-JSON response:`, text.substring(0, 200));
          throw new Error(`${name} API returned invalid format (not JSON)`);
        }
        return res.json();
      };

      const [pData, oData, iData] = await Promise.all([
        safeParse(projectRes, "Project"),
        safeParse(orderRes, "Order"),
        safeParse(itemsRes, "Items")
      ]);

      if (pData.project) {
        setProject(pData.project);
        memoryCache.projects[projectId] = pData.project;
      }
      if (oData.order) {
        setOrder(oData.order);
        memoryCache.orders[orderId] = oData.order;
      }
      if (iData.items) {
        setItems(iData.items);
      }
    } catch (error: any) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMilestone = () => {
    setMilestones([...milestones, { name: "", percentage: 0 }]);
  };

  const handleRemoveMilestone = (index: number) => {
    const newMs = [...milestones];
    newMs.splice(index, 1);
    setMilestones(newMs);
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const newMs = [...milestones];
    newMs[index] = { ...newMs[index], [field]: value };
    setMilestones(newMs);
  };

  const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    if (totalPercentage !== 100) {
      alert("Total billing breakup percentage must be exactly 100%");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/items/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          rate: Number(formData.rate),
          milestones
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create item");
      }

      // Reset form and reload
      setFormData({
        item_code: "",
        description: "",
        short_description: "",
        unit: "MT",
        department: "",
        quantity: "",
        rate: ""
      });
      setMilestones([{ name: "Advance Payment", percentage: 100 }]);
      setIsModalOpen(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      void loadData(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ─── Breadcrumb ─── */}
      <div className="mb-8">
        <Link
          href={`/dashboard/projects/${projectId}/orders`}
          className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          Back to Orders
        </Link>
      </div>

      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-slate-900 dark:text-white">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {isLoading && !order ? "Loading..." : (order?.title || "Order Details")}
          </h1>
          <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
            <span>Order #{order?.order_code || "---"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
            <span className="text-blue-600 dark:text-blue-400">{project?.name || "---"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-2xl transition-all border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95">
            <FileText className="w-5 h-5 text-blue-600" />
            Generate RA Bill
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* ─── Filters & Sort ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8 text-slate-900 dark:text-white font-extrabold text-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
            <Filter className="w-5 h-5" />
          </div>
          <h2>Filters & Sort</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Department</label>
            <div className="relative group">
              <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full appearance-none px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option>All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Sort By</label>
            <div className="relative group">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option>Description</option>
                <option>Amount</option>
                <option>Department</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Display Order</label>
            <div className="relative group">
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full appearance-none px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option>Ascending</option>
                <option>Descending</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Items Table ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-12">#</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] min-w-[350px]">Description</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Department</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Unit</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Quantity</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Unit Rate</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {isLoading && items.length === 0 ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-8 py-8">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full" />
                         <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                            <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded w-1/2" />
                         </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20 dark:opacity-10">
                      <Package className="w-20 h-20 mb-6" />
                      <p className="text-xl font-extrabold tracking-tight">No items found matching filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all group">
                    <td className="px-8 py-6 text-xs font-bold text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-500 uppercase tracking-widest leading-none drop-shadow-sm">{item.item_code}</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-relaxed line-clamp-2">{item.description}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestones Attached</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50">
                        {item.department}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{item.unit}</td>
                    <td className="px-8 py-6 text-sm font-extrabold text-slate-900 dark:text-white text-right font-mono">{Number(item.quantity).toFixed(3)}</td>
                    <td className="px-8 py-6 text-sm font-extrabold text-slate-900 dark:text-white text-right font-mono">₹{Number(item.rate).toLocaleString("en-IN")}</td>
                    <td className="px-8 py-6 text-base font-black text-blue-600 dark:text-blue-400 text-right font-mono tracking-tight">₹{(item.quantity * item.rate).toLocaleString("en-IN")}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                          <Settings className="w-3.5 h-3.5" />
                          Measure
                        </button>
                        <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/40">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* Total Items */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[2rem] p-7 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group overflow-hidden relative">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shadow-sm border border-blue-50 dark:border-blue-800">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-extrabold text-blue-900 dark:text-white tracking-tight leading-none mb-2">
              {summaryStats.totalItems}
            </h3>
            <p className="text-xs font-bold text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest">Total Items</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
        </div>

        {/* Total Amount */}
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem] p-7 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all group overflow-hidden relative">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50 dark:border-emerald-800">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-extrabold text-emerald-900 dark:text-white tracking-tight leading-none mb-2">
              ₹{summaryStats.totalAmount.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest">Total Amount</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
        </div>

        {/* Departments */}
        <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-[2rem] p-7 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all group overflow-hidden relative">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-purple-900/40 flex items-center justify-center text-purple-600 shadow-sm border border-purple-50 dark:border-purple-800">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-extrabold text-purple-900 dark:text-white tracking-tight leading-none mb-2">
              {summaryStats.departments}
            </h3>
            <p className="text-xs font-bold text-purple-600/60 dark:text-purple-400/60 uppercase tracking-widest">Departments</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
        </div>

        {/* Avg Amount */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2rem] p-7 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all group overflow-hidden relative">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-amber-900/40 flex items-center justify-center text-amber-600 shadow-sm border border-amber-50 dark:border-amber-800">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-extrabold text-amber-900 dark:text-white tracking-tight leading-none mb-2 text-nowrap">
              ₹{Math.round(summaryStats.averageAmount).toLocaleString("en-IN")}
            </h3>
            <p className="text-xs font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">Avg Amount</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
        </div>
      </div>

      {/* ─── Success Toast ─── */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 right-12 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-5 flex items-center gap-5 min-w-[350px] overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 border border-emerald-100 dark:border-emerald-800 shadow-sm shadow-emerald-500/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white text-lg">Item Created!</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Project updated successfully</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add New Item Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 relative z-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Add New Item</h2>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Workspace: {project?.name}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar relative z-10">
                <form id="item-form" onSubmit={handleSubmit} className="space-y-10">
                  {/* Basic Info Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Item Code</label>
                        <input 
                           type="text"
                           placeholder="e.g., S00995413"
                           value={formData.item_code}
                           onChange={e => setFormData({...formData, item_code: e.target.value})}
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Department*</label>
                        <div className="relative group">
                           <select 
                              required
                              value={formData.department}
                              onChange={e => setFormData({...formData, department: e.target.value})}
                              className="w-full appearance-none px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer"
                           >
                              <option value="">Select Department</option>
                              {departments.map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                           <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Description*</label>
                     <textarea 
                        required
                        rows={4}
                        placeholder="Detailed description of the work item..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-[1.5rem] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 resize-none"
                     />
                  </div>

                  {/* Financials Group */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-blue-50/30 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100/50 dark:border-blue-900/30">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1">Unit*</label>
                        <div className="relative group">
                           <select 
                              required
                              value={formData.unit}
                              onChange={e => setFormData({...formData, unit: e.target.value})}
                              className="w-full appearance-none px-5 py-3.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer"
                           >
                              <option value="MT">MT</option>
                              <option value="KG">KG</option>
                              <option value="LS">LS</option>
                              <option value="NOS">NOS</option>
                              <option value="M">M</option>
                              <option value="SQM">SQM</option>
                              <option value="CUM">CUM</option>
                           </select>
                           <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none group-hover:text-blue-500" />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1">Total Quantity*</label>
                        <input 
                           required
                           type="number"
                           step="0.001"
                           placeholder="0.000"
                           value={formData.quantity}
                           onChange={e => setFormData({...formData, quantity: e.target.value})}
                           className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-slate-900 dark:text-white font-mono"
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1">Unit Rate (₹)*</label>
                        <input 
                           required
                           type="number"
                           step="0.01"
                           placeholder="0.00"
                           value={formData.rate}
                           onChange={e => setFormData({...formData, rate: e.target.value})}
                           className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-slate-900 dark:text-white font-mono"
                        />
                     </div>
                  </div>

                  {/* Billing Breakup Section */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                       <div>
                        <label className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Billing Milestones</label>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sum must equal 100%</p>
                       </div>
                      <button 
                        type="button"
                        onClick={handleAddMilestone}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800/90 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        Add Milestone
                      </button>
                    </div>

                    <div className="space-y-4">
                      {milestones.map((ms, idx) => (
                        <div key={idx} className="flex gap-4 items-center group bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-[1.5rem] border border-transparent hover:border-slate-200 transition-all">
                          <div className="flex-1">
                            <input 
                              required
                              type="text"
                              placeholder="e.g., Fabrication Completion"
                              value={ms.name}
                              onChange={e => updateMilestone(idx, "name", e.target.value)}
                              className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="w-32 relative">
                            <input 
                              required
                              type="number"
                              placeholder="100"
                              value={ms.percentage}
                              onChange={e => updateMilestone(idx, "percentage", e.target.value)}
                              className="w-full pl-5 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-right focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                          </div>
                          {milestones.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveMilestone(idx)}
                              className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all ml-2"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between px-4 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                       <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${totalPercentage === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                          <span className={`text-sm font-black tracking-tight ${totalPercentage === 100 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                            Total Allocation: {totalPercentage}%
                          </span>
                       </div>
                       {totalPercentage !== 100 && (
                         <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Adjustment Required</span>
                       )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-10 py-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-5 relative z-10">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  form="item-form"
                  type="submit"
                  disabled={isSubmitting || totalPercentage !== 100}
                  className="flex items-center gap-3 px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:grayscale text-white text-base font-black rounded-2xl transition-all shadow-xl shadow-blue-600/30 active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {isSubmitting ? "Generating Item..." : "Create New Item"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
