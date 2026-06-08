import { Badge, SectionHeading } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { AdminReviewWorkspace } from "@/components/admin-review-workspace";

export default function AdminDashboardPage() {
  return (
    <SiteShell
      title="Admin control center"
      subtitle="Manage the general paper library, review uploaded answer sheets, upload checked copies, grant paper access, and view the student registry with selected papers and dates."
      actions={<Badge>Admin workspace</Badge>}
    >
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
          <SectionHeading eyebrow="Workspace" title="Everything the admin needs is now in one review area." />
          <p className="mt-3 text-sm leading-7 text-ink-600">
            Upload question papers and sample answers, give a student access to a paper, review answer sheets, and upload the checked copy so the student can see it in their dashboard.
          </p>
        </div>

        <AdminReviewWorkspace />
      </div>
    </SiteShell>
  );
}
