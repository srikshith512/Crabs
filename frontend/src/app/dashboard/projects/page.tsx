"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, X, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api-config";

export default function ProjectsPage() {
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
      if (!sessionString || sessionString === "null") {
        setIsLoading(false);
        return router.push("/login");
      }
      const session = JSON.parse(sessionString);
      if (!session || !session.access_token) return router.push("/login");

      const res = await fetch(`${API_BASE}/projects`, {
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
      if (!sessionString || sessionString === "null") return router.push("/login");
      const session = JSON.parse(sessionString);
      if (!session || !session.access_token) return router.push("/login");

      const res = await fetch(`${API_BASE}/projects`, {
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
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative h-full flex flex-col">
      
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
             Manage your construction projects and track progress
          </p>
        </div>
        <button 
          onClick={() => setIsProjectModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Project
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
             <div key={i} className="bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl h-64 animate-pulse border border-slate-200 dark:border-slate-800"></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex-1 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="mb-6 text-slate-400">
            <Building2 className="w-16 h-16 stroke-[1.5]" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Projects Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
            Get started by creating your first construction project workspace.
          </p>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 className="w-16 h-16 text-slate-900 dark:text-white" />
               </div>

               <div className="mb-6 relative z-10">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-2xl mb-1 line-clamp-1">{project.name}</h3>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
                     <Building2 className="w-3.5 h-3.5" /> {project.client_name}
                  </p>
               </div>

               <div className="space-y-4 mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Orders</p>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">0</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Budget</p>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">₹0</p>
                     </div>
                  </div>
               </div>

               <Link 
                  href={`/dashboard/projects/${project.id}/orders`}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all mt-auto group/btn shadow-sm relative z-10"
               >
                  View Details
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover/btn:translate-x-1 transition-transform"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
               </Link>

               <div className="mt-6 flex items-center justify-center">
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                     Started on {new Date(project.created_at).toLocaleDateString()}
                  </p>
               </div>
            </div>
          ))}
        </div>
      )}


    </div>
  );
}
