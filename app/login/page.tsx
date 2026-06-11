"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";

export default function StudentLoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const mobileDigits = mobile.replace(/\D/g, "").slice(0, 10);
    if (mobileDigits.length !== 10) {
      setMessage("Please enter your 10-digit mobile number.");
      return;
    }

    if (password.trim().length < 8) {
      setMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Checking your registration...");

    try {
      const response = await fetch("/api/auth/login-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileDigits, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message ?? "Unable to open your dashboard.");
        return;
      }

      router.push(data.redirectTo ?? "/student/dashboard");
    } catch {
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SiteShell title="Student access" subtitle="Log in with your registered mobile number or start a new registration." actions={<Badge>Mobile login</Badge>}>
      <div className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm leading-7 text-ink-600">
          Existing students can log in with the mobile number and password they created during registration. If you have not registered yet, start a new enrollment first.
        </p>

        <label className="mt-6 block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">Mobile number</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300"
          />
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            minLength={8}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300"
          />
        </label>

        {message ? <p className="mt-4 rounded-2xl border border-black/5 bg-ink-50 px-4 py-3 text-sm text-ink-700">{message}</p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleLogin}
            disabled={isSubmitting}
            className="rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Opening dashboard..." : "Open dashboard"}
          </button>
          <button
            onClick={() => router.push("/register")}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-ink-900"
          >
            New registration
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowForgot((current) => !current)}
          className="mt-4 text-sm font-semibold text-amber-700 underline decoration-amber-300 underline-offset-4"
        >
          Forgot password?
        </button>

        {showForgot ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
            Please mail <span className="font-semibold">caresilience@gmail.com</span> with subject{" "}
            <span className="font-semibold">"Forgot password"</span> and include your registered email ID.
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
