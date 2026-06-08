"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@resillience.in";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState(ADMIN_EMAIL);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");

  async function requestOtp() {
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: identity || ADMIN_EMAIL, role: "ADMIN" })
    });
    const data = await response.json();
    setStatus(data.message ?? "OTP sent.");
  }

  async function verifyOtp() {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: identity || ADMIN_EMAIL, otp, role: "ADMIN" })
    });
    if (response.ok) {
      router.push("/admin/dashboard");
      return;
    }
    const data = await response.json();
    setStatus(data.message ?? "Invalid OTP.");
  }

  return (
    <SiteShell title="Admin login" subtitle="Secure access for uploads, evaluation, refund approvals, and student tracking." actions={<Badge>Admin only</Badge>}>
      <div className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Permanent admin account: <span className="font-semibold">{ADMIN_EMAIL}</span>
        </p>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-700">Email</span>
          <input
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
            placeholder={ADMIN_EMAIL}
            className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-amber-300"
          />
        </label>
        <div className="mt-4 flex gap-3">
          <button onClick={requestOtp} className="rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white">
            Send OTP
          </button>
        </div>
        <label className="mt-6 block space-y-2">
          <span className="text-sm font-medium text-ink-700">OTP</span>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="123456"
            className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-amber-300"
          />
        </label>
        <button onClick={verifyOtp} className="mt-4 w-full rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white">
          Verify and open dashboard
        </button>
        {status ? <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">{status}</p> : null}
      </div>
    </SiteShell>
  );
}
