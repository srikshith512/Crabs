"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  ShoppingCart, 
  Wallet, 
  Activity,
  Plus,
  TrendingUp,
  LayoutGrid,
  X,
  Loader2
} from "lucide-react";

export default function DashboardPage() {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const sessionString = localStorage.getItem("session");
      if (!sessionString) {
        setIsLoading(false);
        return router.push("/login");
      }
      const session = JSON.parse(sessionString);

      const res = await fetch("http://localhost:5000/api/projects", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const sessionString = localStorage.getItem("session");
      if (!sessionString) return router.push("/login");
      const session = JSON.parse(sessionString);

      const res = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: projectName, client_name: clientName })
      });

      if (res.ok) {
        setIsProjectModalOpen(false);
        setProjectName("");
        setClientName("");
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create project");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Create Project Modal Overlay */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Create New Project</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Launch a new project workspace. You can add orders and items later.
                </p>
              </div>
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Riverside Complex Phase 1" 
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Apex Constructions" 
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsProjectModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 font-medium text-sm">
            <LayoutGrid className="w-4 h-4" />
            <span>Overview</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Track your projects, manage orders, and monitor your billing cycle efficiency.
          </p>
        </div>
        <button 
          onClick={() => setIsProjectModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Active Projects Card */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 relative overflow-hidden group transition-all hover:shadow-lg hover:shadow-blue-500/10">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-blue-900/40 flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-800">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1 bg-white/80 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">+1 this month</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-blue-600/70 dark:text-blue-400/70 mb-1">Active Projects</p>
            <h3 className="text-4xl font-extrabold text-blue-900 dark:text-white tracking-tight">
              {isLoading ? "..." : projects.length}
            </h3>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
        </div>

        {/* Total Orders Card */}
        <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-3xl p-6 relative overflow-hidden group transition-all hover:shadow-lg hover:shadow-purple-500/10">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-purple-900/40 flex items-center justify-center shadow-sm border border-purple-100 dark:border-purple-800">
              <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex items-center gap-1 bg-white/80 dark:bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-100 dark:border-purple-800/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">0 this week</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-purple-600/70 dark:text-purple-400/70 mb-1">Total Orders</p>
            <h3 className="text-4xl font-extrabold text-purple-900 dark:text-white tracking-tight">0</h3>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
        </div>

        {/* Work Done Value Card */}
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-6 relative overflow-hidden group transition-all hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-emerald-900/40 flex items-center justify-center shadow-sm border border-emerald-100 dark:border-emerald-800">
              <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-center gap-1 bg-white/80 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Based on work done</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400/70 mb-1">Work Done Value</p>
            <h3 className="text-4xl font-extrabold text-emerald-900 dark:text-white tracking-tight">₹0</h3>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
        </div>

        {/* Items Completed Card */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl p-6 relative overflow-hidden group transition-all hover:shadow-lg hover:shadow-amber-500/10">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-amber-900/40 flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-800">
              <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex items-center gap-1 bg-white/80 dark:bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Items completed</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-amber-600/70 dark:text-amber-400/70 mb-1">Items Completed</p>
            <h3 className="text-4xl font-extrabold text-amber-900 dark:text-white tracking-tight">0</h3>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
        </div>

      </div>

      {/* Two Column Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Projects (Span 2) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors">
              View all
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl h-48 animate-pulse border border-slate-200 dark:border-slate-800"></div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center p-16 text-center h-[350px]">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <Building2 className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Projects Found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                Get started by creating a new construction project to track your billing cycle.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {projects.slice(0, 3).map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}/orders`} className="block group">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all group-hover:shadow-xl group-hover:border-blue-200 dark:group-hover:border-blue-800 group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-xl line-clamp-1">{project.name}</h3>
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50">Active</span>
                          </div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                             <Building2 className="w-3.5 h-3.5" /> {project.client_name}
                          </p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Project Value</p>
                        <p className="font-bold text-slate-900 dark:text-white">₹0</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Orders</p>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span> 0 Orders
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Timeline</p>
                        <p className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-sm">
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                           On Track
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                          <span>Completion</span>
                          <span className="text-blue-600 dark:text-blue-400">0%</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[0%] rounded-full"></div>
                       </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions (Span 1) */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Quick Actions</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Frequently used functions for faster workflow</p>
          </div>
          
          <div className="space-y-4">
            {/* Action 1 */}
            <div 
              onClick={() => setIsProjectModalOpen(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex gap-4 items-center cursor-pointer hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all group overflow-hidden relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-900 dark:bg-indigo-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform relative z-10 shadow-lg shadow-indigo-900/20">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="relative z-10">
                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg">Add New Project</h4>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Start a new construction project</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Building2 className="w-12 h-12 text-slate-900 dark:text-white" />
              </div>
            </div>

            {/* Action 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex gap-4 items-center cursor-pointer hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-800 group overflow-hidden relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500 dark:bg-orange-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform relative z-10 shadow-lg shadow-orange-500/20">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <div className="relative z-10">
                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors text-lg">Create Order</h4>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Add new order to any project</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <ShoppingCart className="w-12 h-12 text-slate-900 dark:text-white" />
              </div>
            </div>
            
          </div>
        </div>

      </div>

    </div>
  );
}
