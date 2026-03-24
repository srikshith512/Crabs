"use client";

import { Ruler, Filter, ChevronDown } from "lucide-react";

export default function MeasurementsPage() {
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Measurements</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Manage measurement sheets for all orders
            </p>
          </div>
        </div>
        
        <div className="flex items-end md:items-center gap-3 md:gap-4 md:flex-row self-start md:self-auto w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0">
            <Filter className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer shadow-sm shrink-0">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">All Orders</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white ml-2 shrink-0">
            0 Items
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <div className="mb-5 w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
          <Ruler className="w-10 h-10 text-blue-600 dark:text-blue-400 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Orders Found</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Create projects and orders to start adding measurements.
        </p>
      </div>
    </div>
  );
}
