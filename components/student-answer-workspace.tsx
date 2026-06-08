"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/pricing";

type PaperAccessItem = {
  id: string;
  subject: string;
  title: string;
  fileUrl: string | null;
  sampleAnswerUrl: string | null;
  canDownloadPaper: boolean;
  canDownloadAnswer: boolean;
};

type SubmissionItem = {
  id: string;
  subject: string;
  paperTitle: string;
  fileUrl: string;
  checkedAnswerUrl?: string | null;
  status: string;
  marksAwarded?: number | null;
  evaluatorNote?: string | null;
};

type ScheduleItem = {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  dueDateLabel: string;
  dueIn: string;
  canUpload: boolean;
};

type StudentAnswerWorkspaceProps = {
  schedule: ScheduleItem[];
  paymentStatus: "WAITING_CONFIRMATION" | "APPROVED" | "REJECTED";
};

export function StudentAnswerWorkspace({ schedule, paymentStatus }: StudentAnswerWorkspaceProps) {
  const [papers, setPapers] = useState<PaperAccessItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [message, setMessage] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  async function refresh() {
    const [papersResponse, submissionsResponse] = await Promise.all([
      fetch("/api/students/papers"),
      fetch("/api/students/submissions")
    ]);

    const papersData = await papersResponse.json();
    const submissionsData = await submissionsResponse.json();

    setPapers(papersData.papers ?? []);
    setSubmissions(submissionsData.submissions ?? []);
  }

  useEffect(() => {
    refresh().catch(() => setMessage("Unable to load uploads right now."));
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 12000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = String(formData.get("subject") ?? "");
    const paperTitle = String(formData.get("paperTitle") ?? "");

    if (!subject || !paperTitle || !(formData.get("file") instanceof File)) {
      setMessage("Please choose a paper and upload your answer sheet.");
      return;
    }

    const uploadDueDate = String(formData.get("dueDate") ?? "");
    if (!uploadDueDate) {
      setMessage("Scheduled date missing for this paper.");
      return;
    }

    const dueDate = new Date(uploadDueDate);
    if (Number.isNaN(dueDate.getTime())) {
      setMessage("Scheduled date is invalid.");
      return;
    }

    if (paymentStatus !== "APPROVED") {
      setMessage("Upload will open after admin confirms your payment.");
      return;
    }

    const now = new Date();
    if (now.getTime() < dueDate.getTime()) {
      setMessage(`You can upload this answer sheet on or after ${formatDate(dueDate)}.`);
      return;
    }

    setUploadingKey(`${subject}:${paperTitle}`);
    let response: Response | null = null;
    try {
      response = await fetch("/api/students/submissions", {
        method: "POST",
        body: formData
      });
    } finally {
      setUploadingKey(null);
    }

    if (!response) {
      setMessage("Upload failed.");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "Upload failed.");
      return;
    }

    setMessage("Answer sheet uploaded successfully.");
    event.currentTarget.reset();
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-ink-900">Available papers</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {papers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
              No papers have been granted to you yet.
            </div>
          ) : (
            papers.map((paper) => (
              <div key={paper.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <p className="font-semibold text-ink-900">{paper.title}</p>
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
                    Download question paper
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
                    Download sample answer
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-ink-900">Upload your answer sheet</h3>
        <div className="mt-4 space-y-4">
          {schedule.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
              Your upload slots will appear here after admin confirms your payment and papers are scheduled.
            </div>
          ) : (
            schedule.map((paper) => (
              <form
                key={paper.id}
                className="rounded-2xl border border-black/5 bg-ink-50 p-4"
                onSubmit={uploadSubmission}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink-900">{paper.title}</p>
                    <p className="text-sm text-ink-600">{paper.subject}</p>
                    <p className="text-xs text-ink-500">Scheduled for {paper.dueDateLabel}</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {paper.canUpload ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Upload open</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Locked until {paper.dueDateLabel}</span>
                    )}
                  </p>
                </div>
                <input type="hidden" name="subject" value={paper.subject} />
                <input type="hidden" name="paperTitle" value={paper.title} />
                <input type="hidden" name="dueDate" value={paper.dueDate} />
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="block">
                    <span className="text-sm font-medium text-ink-700">File</span>
                    <input
                      name="file"
                      type="file"
                      disabled={!paper.canUpload}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 disabled:cursor-not-allowed disabled:bg-ink-100"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!paper.canUpload || uploadingKey === `${paper.subject}:${paper.title}`}
                    className="rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!paper.canUpload
                      ? "Upload locked"
                      : uploadingKey === `${paper.subject}:${paper.title}`
                        ? "Uploading..."
                        : "Upload sheet"}
                  </button>
                </div>
              </form>
            ))
          )}
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">{message}</p> : null}
      </div>

      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-ink-900">Your uploaded and reviewed copies</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {submissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
              Uploaded answer sheets will appear here.
            </div>
          ) : (
            submissions.map((submission) => (
              <article key={submission.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <p className="font-semibold text-ink-900">{submission.paperTitle}</p>
                <p className="text-sm text-ink-600">{submission.subject}</p>
                <p className="mt-2 text-sm text-ink-600">Status: {submission.status}</p>
                <p className="text-sm text-ink-600">Marks: {submission.marksAwarded ?? "Pending"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-900"
                  >
                    Download your upload
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
                    Download checked copy
                  </a>
                </div>
                {submission.evaluatorNote ? <p className="mt-3 text-sm leading-6 text-ink-600">{submission.evaluatorNote}</p> : null}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
