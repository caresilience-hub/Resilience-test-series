import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";
import { ADMIN_USERNAME } from "@/lib/admin-credentials";

type AdminLoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const errorMessage = searchParams?.error ?? "";
  const status =
    errorMessage === "missing"
      ? "Please enter both username and password."
      : errorMessage === "invalid"
        ? "Invalid admin credentials."
        : "";

  return (
    <SiteShell title="Admin login" subtitle="Secure access for uploads, evaluation, refund approvals, and student tracking." actions={<Badge>Admin only</Badge>}>
      <form action="/api/auth/admin-login" method="post" className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Admin username: <span className="font-semibold">{ADMIN_USERNAME}</span>
        </p>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink-700">Username</span>
          <input
            name="username"
            defaultValue={ADMIN_USERNAME}
            placeholder={ADMIN_USERNAME}
            className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-amber-300"
          />
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-ink-700">Password</span>
          <input
            name="password"
            type="password"
            placeholder="Enter password"
            className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-amber-300"
          />
        </label>

        <button className="mt-5 w-full rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
          Login and open dashboard
        </button>

        {status ? <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">{status}</p> : null}
      </form>
    </SiteShell>
  );
}
