"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, 
  LayoutDashboard, 
  FolderOpen, 
  FileText, 
  Ruler,
  Search,
  Menu,
  X,
  LogOut,
  Settings,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/dashboard/projects", icon: FolderOpen },
    { name: "Bill History", href: "/dashboard/bills", icon: FileText },
    { name: "Measurements", href: "/dashboard/measurements", icon: Ruler },
  ];

  const handleLogout = () => {
    localStorage.removeItem("session");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Slider */}
      <aside className={`fixed inset-y-0 left-0 bg-gradient-to-b from-indigo-700 to-violet-900 flex flex-col z-50 transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "w-64 md:w-20" : "w-64"}`}>
        
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center bg-gradient-to-r from-blue-700 to-indigo-700 flex-shrink-0 transition-all duration-300 ${isCollapsed ? "px-6 md:justify-center md:px-0 justify-between" : "px-6 justify-between"}`}>
          <Link href="/dashboard" className="flex items-center gap-2 text-white overflow-hidden">
            <Building2 className="w-6 h-6 shrink-0" />
            <span className={`text-xl font-bold tracking-tight whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? "md:hidden" : "block"}`}>CRABS</span>
          </Link>
          <button 
            className="md:hidden text-white/80 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center py-3 rounded-lg font-medium transition-all duration-200 group ${
                  isCollapsed ? "justify-start md:justify-center px-4 md:px-0 gap-3 md:gap-0" : "justify-start px-4 gap-3"
                } ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-700/20" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-white/60 group-hover:text-white transition-colors"}`} />
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? "md:hidden" : "block"}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 flex justify-center items-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 w-full">
          
          <div className="flex items-center flex-1">
            {/* Mobile Menu Slider Button */}
            <button 
              className="md:hidden p-2 mr-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Centered Search Bar */}
            <div className="relative w-full max-w-xl mx-auto hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search projects, orders, or clients..." 
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm transition-all text-slate-900 dark:text-white outline-none placeholder-slate-400"
              />
            </div>
            
            {/* Mobile Search Icon only */}
            <button className="sm:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg ml-auto">
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4 ml-4">
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Notification Icon */}
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors">
              <div className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2 border-2 border-white dark:border-slate-900 shadow-sm"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            
            {/* Profile */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 shadow-sm transition-transform active:scale-95"
              >
                <img 
                  src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=f0f0f0" 
                  alt="User Avatar" 
                  className="w-full h-full rounded-full bg-white object-cover"
                />
              </button>


              {/* Enhanced Dropdown Menu */}
              {isProfileOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Admin User</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">admin@crabs.com</p>
                    </div>
                    <Link 
                      href="/dashboard/settings" 
                      onClick={() => setIsProfileOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </Link>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                    <button 
                      onClick={handleLogout} 
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-500" /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
