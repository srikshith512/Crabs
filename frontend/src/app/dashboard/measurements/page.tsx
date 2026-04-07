"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ruler, 
  Filter, 
  ChevronDown, 
  Search, 
  Hash, 
  ChevronRight, 
  FileText, 
  ArrowRight,
  Loader2,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Project = {
  id: string;
  name: string;
};

type Order = {
  id: string;
  project_id: string;
  order_code: string;
  title: string;
  description: string;
};

type Item = {
  id: string;
  order_id: string;
  item_code: string;
  description: string;
  department: string;
  measurements_count?: number; // Mock data
};

const API_BASE = "http://localhost:5000/api";

export default function MeasurementsPage() {
  const router = useRouter();
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [ordersWithItems, setOrdersWithItems] = useState<{order: Order, items: Item[], project: Project}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrder, setFilterOrder] = useState("All Orders");

  const getSessionToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString) {
      router.push("/login");
      return null;
    }
    const session = JSON.parse(sessionString);
    return session.access_token as string;
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const token = getSessionToken();
    if (!token) return;

    setIsLoading(true);
    try {
      // 1. Fetch all projects
      const projectsRes = await fetch(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const pData = await projectsRes.json();
      const fetchedProjects = pData.projects || [];
      setProjects(fetchedProjects);

      // 2. For each project, fetch its orders
      const allOrdersPromises = fetchedProjects.map((p: Project) => 
        fetch(`${API_BASE}/orders/project/${p.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        }).then(res => res.json())
      );
      
      const ordersData = await Promise.all(allOrdersPromises);
      
      // 3. For each order, fetch its items
      let ordersWithItemsList: {order: Order, items: Item[], project: Project}[] = [];
      
      const itemPromises: Promise<any>[] = [];
      const orderProjectMap: Record<string, Project> = {};
      
      ordersData.forEach((data, idx) => {
        const project = fetchedProjects[idx];
        const orders = data.orders || [];
        orders.forEach((o: Order) => {
          orderProjectMap[o.id] = project;
          itemPromises.push(
            fetch(`${API_BASE}/items/order/${o.id}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store'
            }).then(async res => ({
               order: o,
               itemsRes: await res.json()
            }))
          );
        });
      });

      const itemsResults = await Promise.all(itemPromises);
      
      itemsResults.forEach(res => {
        ordersWithItemsList.push({
          order: res.order,
          items: res.itemsRes.items || [],
          project: orderProjectMap[res.order.id]
        });
      });

      setOrdersWithItems(ordersWithItemsList);
    } catch (error) {
      console.error("Failed to load measurements data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived filtered data
  const filteredData = ordersWithItems.filter(group => {
    // Check if the order title or any item matches search
    const matchesOrderSearch = (group.order?.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                               (group.order?.order_code?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    // For Filter Dropdown
    const matchesFilter = filterOrder === "All Orders" || group.order?.title === filterOrder;

    // Filter items first
    const itemsMatchingSearch = group.items.filter(item => 
       (item.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
       (item.item_code?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
       (item.department?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    return matchesFilter && (matchesOrderSearch || itemsMatchingSearch.length > 0);
  });

  const totalItemsCount = filteredData.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      {/* ─── Premium Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
            <Ruler className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Measurements</h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide">Manage measurement sheets for all orders</p>
          </div>
        </div>
        
        {/* All Orders Count */}
        <div className="hidden md:flex flex-col items-end">
           <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums leading-none">
             {isLoading ? "---" : totalItemsCount}
           </span>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Items Found</span>
        </div>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text"
            placeholder="Search projects, orders, or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="h-[58px] px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all shadow-sm group">
            <Filter className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="relative h-[58px] flex-1 md:flex-none">
            <select 
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              className="appearance-none h-full pl-6 pr-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer shadow-sm text-sm"
            >
              <option>All Orders</option>
              {ordersWithItems.map(g => <option key={g.order.id} value={g.order.title}>{g.order.title}</option>)}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          
          <div className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">
             {isLoading ? "---" : totalItemsCount} Items
          </div>
        </div>
      </div>

      {/* ─── Orders List ─── */}
      <div className="flex-1 space-y-10 pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
             <div className="relative">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                <Ruler className="absolute inset-0 m-auto w-6 h-6 text-blue-600/50" />
             </div>
             <div className="text-center">
                <p className="text-xl font-black text-slate-900 dark:text-white">Analyzing Measurement Data</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Compiling orders from all projects...</p>
             </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-center">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <Package className="w-10 h-10 text-slate-300" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">No Items found for Measurement</h3>
             <p className="text-slate-500 font-bold max-w-sm mx-auto text-sm leading-relaxed">
               Try adjusting your search query or department filters to see more results.
             </p>
          </div>
        ) : (
          filteredData.map(group => (
            <motion.div 
              key={group.order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Order Header */}
              <div className="flex items-center gap-4 px-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-800 shadow-sm">
                   <Hash className="w-5 h-5 font-black" />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Order {group.order.order_code}</h2>
                   <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-1">{group.order.title}</p>
                </div>
              </div>

              {/* Items in this Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map(item => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ y: -5 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all group flex flex-col h-full"
                  >
                    <div className="p-7 flex-1">
                       <div className="flex items-start justify-between mb-6">
                         <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/80 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all shadow-sm border border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-800">
                           <FileText className="w-6 h-6" />
                         </div>
                         <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700">
                           {item.department}
                         </span>
                       </div>
                       
                       <div className="space-y-3">
                         <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                           {item.description}
                         </h3>
                         <div className="flex items-center gap-2 text-slate-400">
                           <p className="text-[10px] font-extrabold uppercase tracking-widest italic">{item.item_code}</p>
                         </div>
                       </div>

                       <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex flex-col gap-1">
                         <p className="text-xs font-bold text-slate-400 tracking-wide">Measurements</p>
                         <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">0 entries</p>
                       </div>
                    </div>

                    <div className="px-2 pb-2">
                       <Link 
                         href={`/dashboard/projects/${group.project.id}/orders/${group.order.id}/items`}
                         className="flex items-center justify-center gap-3 w-full py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 rounded-2xl text-xs font-extrabold transition-all active:scale-95 group/btn"
                       >
                         Open Sheet
                         <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                       </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>

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
