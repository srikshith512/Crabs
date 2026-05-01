"use client";

import Link from "next/link";
import { 
  Building2, 
  Ruler, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden bg-[#fafafa] dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="absolute top-0 w-full z-50 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">CRABS</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Log In
            </Link>
            <Link 
              href="/signup" 
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-6 rounded-full transition-all shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute top-40 left-1/2 -translate-x-1/4 w-[600px] h-[300px] bg-purple-100/50 dark:bg-purple-900/20 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-7xl mx-auto text-center z-10 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 border border-blue-100 dark:border-blue-800/50"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping"></span>
            The Future of Construction ERP
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight max-w-5xl mx-auto"
          >
            Build smarter with <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Intelligent Management</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Streamline projects, automate measurements, and master your billing cycle with the most advanced platform for modern contractors.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              href="/signup" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg"
            >
              Start Building Free <span className="text-xl">→</span>
            </Link>
            <Link 
              href="#demo" 
              className="w-full sm:w-auto bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold py-4 px-8 rounded-full transition-all shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md text-lg"
            >
              View Live Demo
            </Link>
          </motion.div>
        </div>

        {/* Dashboard Mockup Component */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-20 max-w-5xl mx-auto relative z-10"
        >
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl rounded-3xl p-4 md:p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-3xl -z-10"></div>
            
            {/* Top Bar of the Mockup */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 h-[300px] md:h-[400px] flex items-center justify-center relative overflow-hidden">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 dark:text-slate-600 font-medium">Interactive Dashboard Preview</p>
              </div>

              {/* Floating Element 1 */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-8 left-8 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-4"
              >
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Project Status</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">On Track</p>
                </div>
              </motion.div>

              {/* Floating Element 2 */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-8 right-8 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-4"
              >
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Efficiency</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">+124% Boost</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Grid Section */}
      <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Everything you need to <span className="text-blue-600 dark:text-blue-500">scale up</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Powerful tools wrapped in a beautiful interface. Designed for speed, built for accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-blue-900/10 transition-shadow group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity rounded-bl-full -z-10`}></div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white ${feature.iconBg} shadow-md`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden border border-slate-800 dark:border-slate-800/50 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/40 to-purple-900/40 opacity-50 dark:opacity-30"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to transform your workflow?
              </h2>
              <p className="text-xl text-slate-300 dark:text-slate-400 mb-10">
                Join thousands of contractors who have switched to a smarter way of managing construction projects.
              </p>
              <Link 
                href="/signup" 
                className="bg-white dark:bg-blue-600 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-blue-700 font-bold py-4 px-10 rounded-full transition-all shadow-xl hover:-translate-y-1 inline-block text-lg"
              >
                Get Started Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 pt-20 pb-10 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">CRABS</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                The complete ERP solution for modern construction management.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</Link></li>
                <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</Link></li>
                <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Roadmap</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</Link></li>
                <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</Link></li>
                <li><Link href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              © 2024 CRABS Construction ERP. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Twitter</Link>
              <Link href="#" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">LinkedIn</Link>
              <Link href="#" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Precise Measurements",
    desc: "Record detailed measurements with automated calculations for areas and weights.",
    icon: <Ruler className="w-6 h-6" />,
    iconBg: "bg-blue-500",
    gradient: "from-blue-100 to-transparent dark:from-blue-500",
  },
  {
    title: "Automated Billing",
    desc: "Generate professional RA bills instantly from your verified measurement sheets.",
    icon: <FileText className="w-6 h-6" />,
    iconBg: "bg-purple-500",
    gradient: "from-purple-100 to-transparent dark:from-purple-500",
  },
  {
    title: "Real-time Analytics",
    desc: "Track project progress, cash flow, and completion rates with live dashboards.",
    icon: <TrendingUp className="w-6 h-6" />,
    iconBg: "bg-indigo-500",
    gradient: "from-indigo-100 to-transparent dark:from-indigo-500",
  },
  {
    title: "Secure Data",
    desc: "Enterprise-grade isolation ensures your construction data is extremely safe and easily restorable.",
    icon: <ShieldCheck className="w-6 h-6" />,
    iconBg: "bg-teal-500",
    gradient: "from-teal-100 to-transparent dark:from-teal-500",
  },
  {
    title: "Lightning Fast",
    desc: "Built on modern tech for zero-latency interactions and ultra-fast workflow completion.",
    icon: <Zap className="w-6 h-6" />,
    iconBg: "bg-amber-500",
    gradient: "from-amber-100 to-transparent dark:from-amber-500",
  },
  {
    title: "Multi-Site Management",
    desc: "Seamlessly switch between multiple ongoing projects with dedicated workspaces.",
    icon: <Building2 className="w-6 h-6" />,
    iconBg: "bg-pink-500",
    gradient: "from-pink-100 to-transparent dark:from-pink-500",
  }
];
