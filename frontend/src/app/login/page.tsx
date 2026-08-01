"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ApiRequestError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      {/* Walnut desk surface backdrop */}
      <div className="absolute inset-0 -z-10 walnut-strip opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="desk-panel w-full max-w-md p-10"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brass-500/40 bg-charcoal-900 shadow-embossed">
            <span className="font-display text-xl text-brass-300">S</span>
          </div>
          <p className="label-eyebrow mb-2">Smart Stationery ERP</p>
          <h1 className="font-display text-3xl font-semibold text-ivory">Welcome back</h1>
          <p className="mt-2 font-body text-sm text-steel-300">
            Sign in to run today&apos;s business.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="label-eyebrow mb-2 block">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="control-input"
              placeholder="owner@yourstore.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-eyebrow mb-2 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="control-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-control border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-brass w-full">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center font-ledger text-xs text-steel-400">
          Access is limited to Shop Owner, Cashier &amp; Inventory Manager accounts.
        </p>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("play_splash_intro"))}
            className="text-xs font-ledger text-brass-400 hover:text-brass-200 transition underline flex items-center justify-center gap-1.5 mx-auto"
          >
            <span>🎬 Replay Intro Greeting</span>
          </button>
        </div>
      </motion.div>
    </main>
  );
}
