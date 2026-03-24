"use client";

import { useState } from "react";
import { User, Lock, Bell, Building, Save } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
            <button 
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left whitespace-nowrap ${activeTab === 'profile' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 border border-transparent'}`}
            >
              <User className="w-5 h-5" />
              Profile Details
            </button>
            <button 
              onClick={() => setActiveTab("company")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left whitespace-nowrap ${activeTab === 'company' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 border border-transparent'}`}
            >
              <Building className="w-5 h-5" />
              Company Info
            </button>
            <button 
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left whitespace-nowrap ${activeTab === 'security' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 border border-transparent'}`}
            >
              <Lock className="w-5 h-5" />
              Security
            </button>
            <button 
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left whitespace-nowrap ${activeTab === 'notifications' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50 border border-transparent'}`}
            >
              <Bell className="w-5 h-5" />
              Notifications
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Personal Information</h2>
              <form className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-1">
                    <img 
                      src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=f0f0f0" 
                      alt="Avatar" 
                      className="w-full h-full rounded-full bg-white object-cover"
                    />
                  </div>
                  <div>
                    <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">
                      Change Avatar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input type="text" defaultValue="Admin User" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                    <input type="email" defaultValue="admin@crabs.com" disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-500 cursor-not-allowed outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mobile Number</label>
                    <input type="tel" defaultValue="+91 9876543210" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all" />
                  </div>
                </div>
                
                <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "company" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Company Information</h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Company Name</label>
                    <input type="text" defaultValue="Acme Constructions" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">GST Number</label>
                    <input type="text" defaultValue="22AAAAA0000A1Z5" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Billing Address</label>
                    <textarea rows={3} defaultValue="123 Builder Avenue, Construct City" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all resize-none"></textarea>
                  </div>
                </div>
                <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Security Settings</h2>
              <form className="space-y-6">
                <div className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all tracking-widest" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all tracking-widest" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all tracking-widest" />
                  </div>
                </div>
                <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                    <Lock className="w-4 h-4" />
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Notification Preferences</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Email Notifications</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Receive daily reports and project updates via email.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Order Alerts</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Get instantly notified when new material orders are placed.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Billing Reminders</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Reminders for pending measurements and unbilled cycle tasks.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
