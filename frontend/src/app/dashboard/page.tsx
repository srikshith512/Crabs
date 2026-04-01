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
        <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800/50">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Total count</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Active Projects</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "..." : projects.length}
            </h3>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-purple-50/50 dark:bg-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800/50">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">0 this week</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Orders</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">0</h3>
          </div>
        </div>

        {/* Work Done Value Card */}
        <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-50/50 dark:bg-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800/50">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">0 cleared</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Work Done Value</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">?0</h3>
          </div>
        </div>

        {/* Items Completed Card */}
        <div className="bg-slate-50/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-orange-50/50 dark:bg-orange-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800/50">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">0 from last month</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Items Completed</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">0</h3>
          </div>
        </div>

      </div>

      {/* Two Column Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Projects (Span 2) */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Projects</h2>
          
          {isLoading ? (
            <div className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-16 text-center h-80 animate-pulse">
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-16 text-center h-[350px]">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Projects running</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                Start by creating a new project from the quick actions menu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 4).map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}/orders`} className="block">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-all group flex flex-col cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 line-clamp-1">{project.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{project.client_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions (Span 1) */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Quick Actions</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Frequently used functions for faster workflow</p>
          </div>
          
          <div className="space-y-4">
            {/* Acton 1 */}
            <div 
              onClick={() => setIsProjectModalOpen(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4 items-center cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-slate-800 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Add New Project</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start a new construction project</p>
              </div>
            </div>

            {/* Acton 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4 items-center cursor-pointer hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800/50 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-orange-500 dark:bg-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">Create Order</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add new order to any project</p>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
