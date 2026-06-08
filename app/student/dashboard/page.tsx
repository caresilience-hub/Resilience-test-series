"use client";

import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { Badge, SectionHeading } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/pricing";
import { StudentAnswerWorkspace } from "@/components/student-answer-workspace";

type DashboardSubmission = {
  id: string;
  paperTitle: string;
  subject: string;
  fileUrl: string;
  checkedAnswerUrl?: string | null;
  status: string;
  marksAwarded?: number | null;
  evaluatorNote?: string | null;
};

type DashboardPaper = {
  id: string;
  subject: string;
  title: string;
  kind?: string;
  fileUrl: string | null;
  sampleAnswerUrl: string | null;
  canDownloadPaper: boolean;
  canDownloadAnswer: boolean;
};

type DashboardData = {
  studentName: string;
  paymentStatus: "WAITING_CONFIRMATION" | "APPROVED" | "REJECTED";
  refundStatus: "NOT_ELIGIBLE" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  plan: {
    courseFee: number;
    refundableDeposit: number;
  };
  subjects: string[];
  eligibility: {
    progress: number;
    eligible: boolean;
    meetsMarkThreshold: boolean;
  };
  upcomingPapers: Array<{
    subject: string;
    title: string;
    dueIn: string;
  }>;
  schedule: Array<{
    id: string;
    subject: string;
    title: string;
    dueDate: string;
    dueDateLabel: string;
    dueIn: string;
    canUpload: boolean;
  }>;
  submissions: DashboardSubmission[];
  grantedPapers: DashboardPaper[];
  lastUpdated: string;
};

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("Loading dashboard...");

  async function refresh() {
    const response = await fetch("/api/students/dashboard", {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "Unable to load dashboard.");
      return;
    }

    setDashboard(data);
    setMessage("");
  }

  useEffect(() => {
    refresh().catch(() => setMessage("Unable to load dashboard."));
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 12000);

    return () => window.clearInterval(timer);
  }, []);

  const plan = dashboard?.plan ?? { courseFee: 0, refundableDeposit: 0 };
  const enrolledSubjects = dashboard?.subjects ?? [];
  const eligibility = dashboard?.eligibility ?? { progress: 0, eligible: false, meetsMarkThreshold: false };
  const upcomingPapers = dashboard?.upcomingPapers ?? [];
  const schedule = dashboard?.schedule ?? [];
  const grantedPapers = dashboard?.grantedPapers ?? [];
  const submissions = dashboard?.submissions ?? [];
  const paymentStatus = dashboard?.paymentStatus ?? "WAITING_CONFIRMATION";
  const refundStatus = dashboard?.refundStatus ?? "NOT_ELIGIBLE";

  const refundStatusLabel =
    refundStatus === "APPROVED"
      ? "Refund approved"
      : refundStatus === "REJECTED"
        ? "Refund rejected"
        : refundStatus === "UNDER_REVIEW"
          ? "Refund under review"
          : "Not eligible yet";

  if (!dashboard || paymentStatus !== "APPROVED") {
    return (
      <SiteShell
        title={`Welcome back, ${dashboard?.studentName ?? "student"}`}
        subtitle="Your enrollment has been submitted. The dashboard unlocks after admin confirms your UPI transfer."
        actions={<Badge>Student dashboard</Badge>}
      >
        {message ? <p className="mb-6 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-ink-700 shadow-soft">{message}</p> : null}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
              <SectionHeading eyebrow="Status" title="Waiting for admin confirmation" />
              <p className="mt-4 text-sm leading-7 text-ink-600">
                Your papers and dates are saved. The student dashboard schedule will appear once an admin confirms the payment in the admin console.
              </p>
              <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-900">Current state</p>
                <p className="mt-2 text-lg font-semibold text-amber-800">Waiting for admin confirmation</p>
              </div>
            </div>
          </section>
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
              <SectionHeading eyebrow="Summary" title="Your enrollment details are saved" />
              <div className="mt-4 space-y-3 text-sm text-ink-600">
                <p>Subjects: {enrolledSubjects.length ? enrolledSubjects.join(", ") : "Not loaded yet"}</p>
                <p>Course fee: {formatCurrency(plan.courseFee)}</p>
                <p>Deposit: {formatCurrency(plan.refundableDeposit)}</p>
              </div>
            </div>
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
              <SectionHeading eyebrow="Refund status" title="Deposit refund decision" />
              <p
                className={`mt-4 text-lg font-semibold ${
                  refundStatus === "APPROVED"
                    ? "text-emerald-700"
                    : refundStatus === "REJECTED"
                      ? "text-red-700"
                      : refundStatus === "UNDER_REVIEW"
                        ? "text-amber-700"
                        : "text-ink-700"
                }`}
              >
                {refundStatusLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Once your payment is approved and your papers are evaluated, the admin can move your deposit refund into review or final approval.
              </p>
            </div>
          </aside>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      title={`Welcome back, ${dashboard?.studentName ?? "student"}`}
      subtitle="Track your papers, deadlines, uploads, evaluation status, sample answers, and refund eligibility in one place."
      actions={<Badge>Student dashboard</Badge>}
    >
      {message ? <p className="mb-6 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-ink-700 shadow-soft">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Plan overview" title="Your enrolled subjects and commitment window." />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-ink-900 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Course fee</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(plan.courseFee)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-900">Refundable deposit</p>
                <p className="mt-2 text-2xl font-semibold text-amber-800">{formatCurrency(plan.refundableDeposit)}</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-ink-500">Eligible progress</p>
                <p className="mt-2 text-2xl font-semibold text-ink-900">{eligibility.progress}%</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {enrolledSubjects.length === 0 ? (
                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">No subjects loaded yet</span>
              ) : (
                enrolledSubjects.map((subject) => (
                  <span key={subject} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">
                    {subject}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Granted papers" title="Question papers and sample answers unlocked by admin." />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {grantedPapers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No papers have been granted to you yet.
                </div>
              ) : (
                grantedPapers.map((paper) => (
                  <article key={paper.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink-900">{paper.title}</p>
                      {paper.kind ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                          {paper.kind === "answer-sheet" ? "Answer sheet" : "Question paper"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-ink-600">{paper.subject}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={paper.canDownloadPaper ? paper.fileUrl ?? "#" : "#"}
                        target={paper.canDownloadPaper ? "_blank" : undefined}
                        rel={paper.canDownloadPaper ? "noopener noreferrer" : undefined}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                          paper.canDownloadPaper ? "bg-ink-900 text-white" : "cursor-not-allowed bg-white text-ink-400"
                        }`}
                        onClick={(event) => {
                          if (!paper.canDownloadPaper) event.preventDefault();
                        }}
                      >
                        Open question paper
                      </a>
                      <a
                        href={paper.canDownloadAnswer ? paper.sampleAnswerUrl ?? "#" : "#"}
                        target={paper.canDownloadAnswer ? "_blank" : undefined}
                        rel={paper.canDownloadAnswer ? "noopener noreferrer" : undefined}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                          paper.canDownloadAnswer ? "border border-black/10 bg-white text-ink-900" : "cursor-not-allowed bg-white text-ink-400"
                        }`}
                        onClick={(event) => {
                          if (!paper.canDownloadAnswer) event.preventDefault();
                        }}
                      >
                        Open answer sheet
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Upcoming papers" title="Deadlines and scheduled papers." />
            <div className="mt-6 space-y-4">
              {upcomingPapers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No timeline entries yet.
                </div>
              ) : (
                upcomingPapers.map((paper) => (
                  <div key={`${paper.subject}-${paper.title}`} className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-ink-50 p-4">
                    <div>
                      <p className="font-semibold text-ink-900">{paper.title}</p>
                      <p className="text-sm text-ink-600">{paper.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-700">{paper.dueIn}</p>
                      <p className="text-xs text-ink-500">until deadline</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Planned schedule" title="Your paper schedule and upload window." />
            <div className="mt-6 space-y-4">
              {schedule.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No schedule entries loaded yet.
                </div>
              ) : (
                schedule.map((paper) => (
                  <div key={paper.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-ink-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink-900">{paper.title}</p>
                      <p className="text-sm text-ink-600">{paper.subject}</p>
                      <p className="text-xs text-ink-500">Scheduled for {paper.dueDateLabel}</p>
                    </div>
                    <div className="text-sm font-semibold">
                      {paper.canUpload ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Upload open</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Upload opens on {paper.dueDateLabel}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Uploads" title="Upload answer sheets and view checked copies." />
            <div className="mt-6">
              <StudentAnswerWorkspace schedule={schedule} paymentStatus={paymentStatus} />
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Refund status" title="Deposit eligibility tracker" />
            <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-500">Current refund decision</p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  refundStatus === "APPROVED"
                    ? "text-emerald-700"
                    : refundStatus === "REJECTED"
                      ? "text-red-700"
                      : refundStatus === "UNDER_REVIEW"
                        ? "text-amber-700"
                        : "text-ink-700"
                }`}
              >
                {refundStatusLabel}
              </p>
            </div>
            <div className="mt-6 rounded-2xl bg-ink-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900">Minimum 80 marks attempt</p>
                <p className="text-sm font-semibold text-ink-900">{eligibility.progress}%</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${eligibility.progress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-600">
                {eligibility.eligible
                  ? "Your attempt is currently eligible for manual refund review."
                  : "Keep submitting on time and complete enough attempts to unlock refund review."}
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">Eligibility checks</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li>• Minimum 80 marks attempted</li>
                <li>• Timelines followed</li>
                <li>• Admin marked sincere attempt</li>
                <li>• Refund approved manually by admin</li>
              </ul>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink-600">
              Final refund outcome:{" "}
              <span className="font-semibold text-ink-900">{refundStatusLabel}</span>
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Doubt solving" title="Raise a query for CA review." />
            <textarea
              rows={6}
              placeholder="Describe the concept or paper section you need help with..."
              className="mt-4 w-full rounded-2xl border border-black/10 p-4 text-sm outline-none focus:border-amber-300"
            />
            <button className="mt-4 w-full rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white">Send request</button>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <SectionHeading eyebrow="Notes" title="Communication and notifications" />
            <p className="mt-4 text-sm leading-7 text-ink-600">
              Email reminders and WhatsApp notifications can be hooked into the backend notification service. This dashboard is ready for those integrations.
            </p>
            <p className="mt-4 text-sm text-ink-500">Last updated: {formatDate(dashboard ? new Date(dashboard.lastUpdated) : new Date())}</p>
          </div>
        </aside>
      </div>

      {dashboard?.submissions?.length ? (
        <div className="mt-6 rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
          <SectionHeading eyebrow="Submissions" title="Your uploaded and reviewed answer sheets." />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {submissions.map((submission) => (
              <article key={submission.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <p className="font-semibold text-ink-900">{submission.paperTitle}</p>
                <p className="text-sm text-ink-600">{submission.subject}</p>
                <p className="mt-2 text-sm text-ink-600">Status: {submission.status}</p>
                <p className="text-sm text-ink-600">Marks: {submission.marksAwarded ?? "Pending"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-900">
                    Open your upload
                  </a>
                  <a
                    href={submission.checkedAnswerUrl ?? "#"}
                    target={submission.checkedAnswerUrl ? "_blank" : undefined}
                    rel={submission.checkedAnswerUrl ? "noopener noreferrer" : undefined}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                      submission.checkedAnswerUrl ? "bg-amber-600 text-white" : "cursor-not-allowed bg-white text-ink-400"
                    }`}
                    onClick={(event) => {
                      if (!submission.checkedAnswerUrl) event.preventDefault();
                    }}
                  >
                    Open checked copy
                  </a>
                </div>
                {submission.evaluatorNote ? <p className="mt-3 text-sm leading-6 text-ink-600">{submission.evaluatorNote}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
