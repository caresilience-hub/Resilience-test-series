"use client";

import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";

export default function StudentLoginPage() {
  const router = useRouter();

  return (
    <SiteShell title="Student access" subtitle="Your dashboard opens after registration and payment confirmation." actions={<Badge>No OTP login</Badge>}>
      <div className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm leading-7 text-ink-600">
          OTP login has been removed. Use the registration flow to create or update your enrollment, then open your dashboard once your payment is confirmed.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/register")}
            className="rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Start registration
          </button>
          <button
            onClick={() => router.push("/student/dashboard")}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-ink-900"
          >
            Open dashboard
          </button>
        </div>
      </div>
    </SiteShell>
  );
}
