"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, X, Loader2 } from "lucide-react";

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
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage your construction projects and track progress
          </p>
        </div>
        <button 
          onClick={() => setIsProjectModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 animate-pulse min-h-[400px]">
        </div>
      ) : projects.length === 0 ? (
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="mb-6 text-slate-400">
            <Building2 className="w-16 h-16 stroke-[1.5]" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Projects Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
            Get started by creating your first construction project workspace.
          </p>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}/orders`} className="block">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-md transition-all group flex flex-col cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-1.5 line-clamp-1">{project.name}</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mb-6">{project.client_name}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">0 orders</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline">Open Orders &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
