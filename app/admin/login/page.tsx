"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";
import { ADMIN_USERNAME } from "@/lib/admin-credentials";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setStatus("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Checking credentials...");

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.message ?? "Unable to open admin console.");
        return;
      }

      router.push(data.redirectTo ?? "/admin/dashboard");
    } catch {
      setStatus("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SiteShell title="Admin login" subtitle="Secure access for uploads, evaluation, refund approvals, and student tracking." actions={<Badge>Admin only</Badge>}>
      <div className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Admin username: <span className="font-semibold">{ADMIN_USERNAME}</span>
        </p>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-700">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={ADMIN_USERNAME}
            className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-amber-300"
          />
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-ink-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-amber-300"
          />
        </label>

        <button
          onClick={handleLogin}
          disabled={isSubmitting}
          className="mt-5 w-full rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Opening dashboard..." : "Login and open dashboard"}
        </button>

        {status ? <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">{status}</p> : null}
      </div>
    </SiteShell>
  );
}
