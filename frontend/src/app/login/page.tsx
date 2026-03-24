"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Invalid login credentials") {
          setError("Invalid credentials. If you do not have an account, please sign up first.");
        } else {
          setError(data.error || "Login Failed");
        }
        return;
      }

      localStorage.setItem("session", JSON.stringify(data.session));
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-slate-950 transition-colors duration-300">
      <div className="md:hidden absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-700 via-indigo-600 to-indigo-900 p-12 lg:p-24 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>

        <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity z-10 w-fit">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">CRABS</span>
        </Link>

        <div className="z-10 mt-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
            Welcome back to <br /> Smart Construction.
          </h2>
          <div className="pl-6 border-l-4 border-blue-400 mb-12">
            <p className="text-lg md:text-xl text-blue-100 font-medium italic mb-2">
              "The accuracy and speed of CRABS have completely transformed how we handle our billing cycles. It's indispensable."
            </p>
          </div>
        </div>

        <div className="z-10 mt-16 text-sm text-blue-200/60">
          © 2024 CRABS System. All Rights Reserved.
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative">
        <div className="absolute top-8 right-8 hidden md:block">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Sign in to your account</h1>
            <p className="text-slate-500 dark:text-slate-400">Enter your details below to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email address *</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="name@company.com" 
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password *</label>
                <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">Forgot password?</Link>
              </div>
              <input 
                type="password" 
                name="password"
                required
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all tracking-widest"
              />
            </div>

            <button 
              type="submit" 
              disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors mt-2 shadow-md flex justify-center items-center gap-2"
            >
              {pending ? "Signing In..." : <>Sign In <span className="font-bold">→</span></>}
            </button>
          </form>

          <div className="mt-10 mb-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-950 px-4 text-slate-400 font-semibold tracking-wider">
                New to CRABS?
              </span>
            </div>
          </div>

          <Link 
            href="/signup" 
            className="w-full block text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
