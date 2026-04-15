"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }

    const accessToken = searchParams.get("access_token");
    if (!accessToken) {
      setError("Missing access token. Please use a valid reset link.");
      setPending(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/update-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      router.push("/login?message=Password+updated+successfully");
    } catch (err: any) {
      setError(err.message);
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h1>
            <p className="text-slate-500 dark:text-slate-400">Please enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password *</label>
              <input 
                type="password" 
                name="password"
                required
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all tracking-widest"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password *</label>
              <input 
                type="password" 
                name="confirmPassword"
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
              {pending ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
