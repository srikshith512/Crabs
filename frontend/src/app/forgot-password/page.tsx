"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset link");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
      setSuccess(false);
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
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative">
        <div className="absolute top-8 right-8 hidden md:block">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Forgot Password</h1>
            <p className="text-slate-500 dark:text-slate-400">Enter your email and we will send you a reset link</p>
          </div>

          {success ? (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-lg text-sm mb-6 border border-green-200 dark:border-green-800 text-center">
              <p className="font-semibold mb-1">Check your inbox</p>
              <p>We've sent a password reset link to your email, if an account exists.</p>
            </div>
          ) : (
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

              <button 
                type="submit" 
                disabled={pending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors mt-2 shadow-md flex justify-center items-center gap-2"
              >
                {pending ? "Sending Link..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold dark:text-blue-400 dark:hover:text-blue-300">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
