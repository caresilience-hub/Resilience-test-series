import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <SiteShell
      title="Admin login"
      subtitle="Secure access for uploads, evaluation, refund approvals, and student tracking."
      actions={<Badge>Admin only</Badge>}
    >
      <Suspense
        fallback={
          <div className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
            <p className="text-sm text-ink-600">Loading admin login...</p>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </SiteShell>
  );
}
