"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/pricing";

type SubmissionItem = {
  id: string;
  studentId: string;
  subject: string;
  paperTitle: string;
  fileUrl: string;
  checkedAnswerUrl?: string | null;
  status: string;
  marksAwarded?: number | null;
  sincereAttempt?: boolean;
  evaluatorNote?: string | null;
  student?: {
    user?: {
      firstName?: string | null;
      surname?: string | null;
      email?: string | null;
      mobile?: string | null;
    } | null;
  } | null;
};

type PaperItem = {
  id: string;
  subject: string;
  title: string;
  kind: string;
  fileUrl: string;
  sampleAnswerUrl?: string | null;
};

type GrantItem = {
  id: string;
  studentId: string;
  subjectPaperId: string;
  canDownloadPaper: boolean;
  canDownloadAnswer: boolean;
  student: {
    user: {
      firstName: string | null;
      surname: string | null;
      email: string;
      mobile: string | null;
    };
  };
  subjectPaper: {
    title: string;
    subject: string;
  };
};

type StudentItem = {
  id: string;
  paymentStatus: "WAITING_CONFIRMATION" | "APPROVED" | "REJECTED";
  refundStatus: "NOT_ELIGIBLE" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  sincerityScore: number;
  selectedSubjects: string[];
  subjectTimelines: Record<string, string>;
  courseFee: number;
  refundableDeposit: number;
  totalPaid: number;
  user: {
    firstName: string | null;
    surname: string | null;
    mobile: string | null;
    email: string;
  };
  enrollments: Array<{
    id: string;
    subject: string;
    dueDate: string;
    timelineDays: number;
  }>;
  submissions: Array<{
    id: string;
    subject: string;
    paperTitle: string;
    status: string;
  }>;
};

type TabKey = "library" | "assignments" | "students" | "payments" | "refunds" | "reviews";

const normalizePaperKind = (kind?: string | null) => kind?.toLowerCase().trim().replace(/\s+/g, "-") ?? "";

export function AdminReviewWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>("library");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [grants, setGrants] = useState<GrantItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [message, setMessage] = useState("");
  const [resetPasswordNotice, setResetPasswordNotice] = useState<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    temporaryPassword: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const approvedStudents = useMemo(() => students.filter((student) => student.paymentStatus === "APPROVED"), [students]);
  const selectedApprovedStudent = useMemo(
    () => approvedStudents.find((student) => student.id === selectedStudentId) ?? null,
    [approvedStudents, selectedStudentId]
  );

  async function refresh() {
    const safeJson = async <T,>(url: string) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return null;
        return (await response.json()) as T;
      } catch {
        return null;
      }
    };

    const [submissionsData, papersData, grantsData, studentsData] = await Promise.all([
      safeJson<{ submissions?: SubmissionItem[] }>("/api/admin/submissions"),
      safeJson<{ papers?: PaperItem[] }>("/api/admin/papers"),
      safeJson<{ grants?: GrantItem[] }>("/api/admin/access"),
      safeJson<{ students?: StudentItem[] }>("/api/admin/students")
    ]);

    setSubmissions(submissionsData?.submissions ?? []);
    setPapers((papersData?.papers ?? []).map((paper) => ({ ...paper, kind: normalizePaperKind(paper.kind) || paper.kind })));
    setGrants(grantsData?.grants ?? []);
    setStudents(studentsData?.students ?? []);
  }

  useEffect(() => {
    refresh().catch(() => setMessage("Unable to load admin workspace right now."));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh().catch(() => undefined);
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Intentionally run once; refresh() is stable enough for polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (approvedStudents.length === 0) {
      if (selectedStudentId) {
        setSelectedStudentId("");
      }
      return;
    }

    if (!approvedStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(approvedStudents[0].id);
    }
  }, [approvedStudents, selectedStudentId]);

  const questionPapers = useMemo(() => papers.filter((paper) => normalizePaperKind(paper.kind) === "question-paper"), [papers]);
  const answerSheets = useMemo(() => papers.filter((paper) => normalizePaperKind(paper.kind) === "answer-sheet"), [papers]);
  const refundReviewStudents = useMemo(() => students.filter((student) => student.paymentStatus === "APPROVED"), [students]);

  async function createPaperRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const uploadedFile = formData.get("file");
    const kind = String(formData.get("kind") ?? "question-paper");
    const subject = String(formData.get("subject") ?? "");
    const title = String(formData.get("title") ?? "");

    if (!subject || !title || !(uploadedFile instanceof File)) {
      setMessage("Please choose a subject, enter a title, and select a file.");
      return;
    }

    const uploadBody = new FormData();
    uploadBody.append("subject", subject);
    uploadBody.append("title", title);
    uploadBody.append("kind", kind);
    uploadBody.append("marks", String(formData.get("marks") ?? 100));
    uploadBody.append("file", uploadedFile);

    setUploading(true);
    let response: Response | null = null;
    try {
      response = await fetch("/api/admin/papers", {
        method: "POST",
        body: uploadBody
      });
    } finally {
      setUploading(false);
    }

    if (!response) {
      setMessage("Paper upload failed.");
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Paper upload failed.");
      return;
    }

    setMessage("Paper saved to the general library.");
    if (data?.paper) {
      setPapers((current) => {
        const normalizedPaper = {
          ...data.paper,
          kind: normalizePaperKind(data.paper.kind) || data.paper.kind
        };
        return [normalizedPaper, ...current.filter((paper) => paper.id !== normalizedPaper.id)];
      });
    }
    event.currentTarget.reset();
    event.currentTarget.querySelectorAll('input[type="file"]').forEach((input) => {
      (input as HTMLInputElement).value = "";
    });
    await refresh();
  }

  async function uploadCheckedAnswer(submissionId: string, formData: FormData) {
    const response = await fetch(`/api/admin/submissions/${submissionId}/checked-answer`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Checked answer upload failed.");
      return;
    }

    setMessage("Checked answer uploaded.");
    await refresh();
  }

  async function deletePaper(paperId: string) {
    const confirmed = window.confirm("Delete this paper from the general library?");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/papers/${paperId}`, {
      method: "DELETE"
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Delete failed.");
      return;
    }

    setMessage("Paper deleted from library.");
    setPapers((current) => current.filter((paper) => paper.id !== paperId));
  }

  async function deleteStudent(studentId: string) {
    const confirmed = window.confirm(
      "Delete this student and all of their registrations, submissions, access grants, and uploaded files?"
    );
    if (!confirmed) return;

    const response = await fetch(`/api/admin/students/${studentId}`, {
      method: "DELETE"
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Unable to delete student.");
      return;
    }

    setMessage("Student and related data deleted.");
    await refresh();
  }

  async function resetStudentPassword(studentId: string) {
    const response = await fetch(`/api/admin/students/${studentId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Unable to reset password.");
      return;
    }

    setResetPasswordNotice({
      studentId: data.studentId ?? studentId,
      studentName: data.student?.name ?? "Student",
      studentEmail: data.student?.email ?? "",
      temporaryPassword: data.temporaryPassword ?? ""
    });
    setMessage("Temporary password generated. Copy it and share it with the student.");
  }

  async function copyTemporaryPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setMessage("Temporary password copied to clipboard.");
    } catch {
      setMessage("Could not copy automatically. Please select and copy the temporary password manually.");
    }
  }

  async function updatePaymentStatus(studentId: string, paymentStatus: "WAITING_CONFIRMATION" | "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/admin/students/${studentId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Unable to update payment status.");
      return;
    }

    setMessage(paymentStatus === "APPROVED" ? "Payment approved." : paymentStatus === "REJECTED" ? "Payment marked rejected." : "Payment reset to waiting.");
    await refresh();
  }

  async function updateRefundStatus(
    studentId: string,
    refundStatus: "NOT_ELIGIBLE" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"
  ) {
    const response = await fetch(`/api/admin/refunds/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refundStatus })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Unable to update refund status.");
      return;
    }

    setMessage(
      refundStatus === "APPROVED"
        ? "Refund approved."
        : refundStatus === "REJECTED"
          ? "Refund rejected."
          : refundStatus === "UNDER_REVIEW"
            ? "Refund marked under review."
            : "Refund reset to not eligible."
    );
    await refresh();
  }

  async function saveAccess(subjectPaperId: string, canDownloadPaper: boolean, canDownloadAnswer: boolean) {
    if (!selectedApprovedStudent) {
      setMessage("Please select an approved student first.");
      return;
    }

    if (!subjectPaperId) {
      setMessage("Please choose a paper from the library.");
      return;
    }

    const response = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedApprovedStudent.id,
        subjectPaperId,
        canDownloadPaper,
        canDownloadAnswer
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Access grant failed.");
      return;
    }

    setMessage("Access updated.");
    await refresh();
  }

  async function updateGrantAccess(
    grantId: string,
    updates: Partial<Pick<GrantItem, "canDownloadPaper" | "canDownloadAnswer">>
  ) {
    const response = await fetch(`/api/admin/access/${grantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Access update failed.");
      return;
    }

    setMessage(data.deleted ? "Access withdrawn." : "Access updated.");
    await refresh();
  }

  async function removeGrant(grantId: string) {
    const confirmed = window.confirm("Remove this access grant completely?");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/access/${grantId}`, {
      method: "DELETE"
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Unable to remove access.");
      return;
    }

    setMessage("Access removed.");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "library", label: "General Paper Library" },
            { key: "assignments", label: "Assign to Students" },
            { key: "students", label: "Student Registry" },
            { key: "payments", label: "Payment Approvals" },
            { key: "refunds", label: "Refund Approvals" },
            { key: "reviews", label: "Review Queue" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key ? "bg-ink-900 text-white" : "border border-black/10 bg-white text-ink-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {resetPasswordNotice ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Temporary password ready</p>
              <p className="mt-2 text-sm font-semibold text-amber-900">
                {resetPasswordNotice.studentName} ({resetPasswordNotice.studentEmail || resetPasswordNotice.studentId})
              </p>
              <p className="mt-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 font-mono text-base font-semibold tracking-[0.12em] text-ink-900">
                {resetPasswordNotice.temporaryPassword}
              </p>
              <p className="mt-2 text-sm text-amber-800">
                Copy this and share it with the student. They can log in with their registered mobile number and this password.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyTemporaryPassword(resetPasswordNotice.temporaryPassword)}
                className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Copy password
              </button>
              <button
                type="button"
                onClick={() => setResetPasswordNotice(null)}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "library" ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-ink-900">General paper library</h3>
            <p className="mt-2 text-sm text-ink-600">
              Store every question paper and answer sheet here first. This cluster is not tied to any student yet.
            </p>
            <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:items-end" onSubmit={createPaperRecord}>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Subject</span>
                <select name="subject" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3">
                  <option>Financial Reporting</option>
                  <option>Financial Management</option>
                  <option>Audit</option>
                  <option>Direct Tax</option>
                  <option>Indirect Tax</option>
                  <option>IBS</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Title</span>
                <input name="title" placeholder="Enter paper title" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Type</span>
                <select name="kind" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3">
                  <option value="question-paper">Question paper</option>
                  <option value="answer-sheet">Answer sheet</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Upload file</span>
                <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Marks</span>
                <input name="marks" type="number" defaultValue={100} className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3" />
              </label>
              <button type="submit" className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white md:col-span-2 xl:col-span-3 md:justify-self-start">
                {uploading ? "Saving..." : "Save to library"}
              </button>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <p className="text-sm font-semibold text-ink-900">Question papers</p>
                <div className="mt-4 space-y-3">
                  {questionPapers.length === 0 ? (
                    <p className="text-sm text-ink-500">No question papers saved yet.</p>
                  ) : (
                    questionPapers.map((paper) => (
                      <div key={paper.id} className="rounded-2xl border border-black/5 bg-white p-4">
                        <p className="font-semibold text-ink-900">{paper.subject}</p>
                        <p className="text-sm text-ink-600">{paper.title}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={paper.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white"
                          >
                            Open PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => deletePaper(paper.id)}
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <p className="text-sm font-semibold text-ink-900">Answer sheets</p>
                <div className="mt-4 space-y-3">
                  {answerSheets.length === 0 ? (
                    <p className="text-sm text-ink-500">No answer sheets saved yet.</p>
                  ) : (
                    answerSheets.map((paper) => (
                      <div key={paper.id} className="rounded-2xl border border-black/5 bg-white p-4">
                        <p className="font-semibold text-ink-900">{paper.subject}</p>
                        <p className="text-sm text-ink-600">{paper.title}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={paper.sampleAnswerUrl ?? paper.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink-900"
                          >
                            Open PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => deletePaper(paper.id)}
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "assignments" ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-ink-900">Assign papers and answers to students</h3>
            <p className="mt-2 text-sm text-ink-600">
              Pick an approved student, choose the correct paper type, and then grant or withdraw access for the question paper or the answer sheet separately.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Approved student</span>
                <select
                  name="studentId"
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 disabled:cursor-not-allowed disabled:bg-ink-100"
                  disabled={approvedStudents.length === 0}
                >
                  <option value="">
                    {approvedStudents.length === 0 ? "No approved students yet" : "Select student"}
                  </option>
                  {approvedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {[student.user.firstName, student.user.surname].filter(Boolean).join(" ") || "Student"} — {student.user.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-black/5 bg-ink-50 px-4 py-3 text-sm text-ink-700">
                Selected:{" "}
                {selectedApprovedStudent
                  ? [selectedApprovedStudent.user.firstName, selectedApprovedStudent.user.surname].filter(Boolean).join(" ") || selectedApprovedStudent.user.email
                  : "No student selected"}
              </div>
            </div>

            {approvedStudents.length === 0 ? (
              <p className="mt-3 text-sm text-amber-700">Approve a student payment first, then assign papers and answer sheets here.</p>
            ) : null}

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <h4 className="text-sm font-semibold text-ink-900">Question paper access</h4>
                <p className="mt-1 text-xs text-ink-500">Choose from question papers only. This avoids sending an answer sheet by mistake.</p>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink-700">Question paper</span>
                    <select
                      defaultValue=""
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
                      onChange={(event) => {
                        const paperId = event.target.value;
                        if (paperId) {
                          saveAccess(paperId, true, false).finally(() => {
                            event.currentTarget.value = "";
                          });
                        }
                      }}
                    >
                      <option value="">Select question paper</option>
                      {questionPapers.map((paper) => (
                        <option key={paper.id} value={paper.id}>
                          {paper.subject} - {paper.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                <h4 className="text-sm font-semibold text-ink-900">Answer sheet access</h4>
                <p className="mt-1 text-xs text-ink-500">Choose from answer sheets only. This keeps the student from opening the wrong file under question paper access.</p>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink-700">Answer sheet</span>
                    <select
                      defaultValue=""
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
                      onChange={(event) => {
                        const paperId = event.target.value;
                        if (paperId) {
                          saveAccess(paperId, false, true).finally(() => {
                            event.currentTarget.value = "";
                          });
                        }
                      }}
                    >
                      <option value="">Select answer sheet</option>
                      {answerSheets.map((paper) => (
                        <option key={paper.id} value={paper.id}>
                          {paper.subject} - {paper.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-ink-900">Current access grants</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {grants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No access grants yet.
                </div>
              ) : (
                grants.map((grant) => (
                  <div key={grant.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                    <p className="font-semibold text-ink-900">
                      {grant.subjectPaper.subject} - {grant.subjectPaper.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      Student: {[grant.student.user.firstName, grant.student.user.surname].filter(Boolean).join(" ") || "Student"}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">Email: {grant.student.user.email}</p>
                    <p className="mt-1 text-sm text-ink-600">Mobile: {grant.student.user.mobile ?? "Not saved"}</p>
                    <p className="mt-1 text-xs text-ink-500">Student ID: {grant.studentId}</p>
                    <p className="mt-1 text-sm text-ink-600">
                      Question paper: {grant.canDownloadPaper ? "Granted" : "Locked"} | Answer sheet: {grant.canDownloadAnswer ? "Granted" : "Locked"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {grant.canDownloadPaper ? (
                        <button
                          type="button"
                          onClick={() => updateGrantAccess(grant.id, { canDownloadPaper: false })}
                          className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800"
                        >
                          Withdraw question paper
                        </button>
                      ) : null}
                      {grant.canDownloadAnswer ? (
                        <button
                          type="button"
                          onClick={() => updateGrantAccess(grant.id, { canDownloadAnswer: false })}
                          className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800"
                        >
                          Withdraw answer sheet
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeGrant(grant.id)}
                        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"
                      >
                        Remove access
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "students" ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-ink-900">Registered students</h3>
            <p className="mt-2 text-sm text-ink-600">
              Every successful registration is stored here with the student details, selected papers, and paper dates.
            </p>
            <div className="mt-6 grid gap-4">
              {students.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No student registrations yet.
                </div>
              ) : (
                students.map((student) => (
                  <article key={student.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink-900">
                          {[student.user.firstName, student.user.surname].filter(Boolean).join(" ") || "Student"}
                        </p>
                        <p className="text-xs text-ink-500">Student ID: {student.id}</p>
                        <p className="text-sm text-ink-600">{student.user.email}</p>
                        <p className="text-sm text-ink-600">{student.user.mobile ?? "No mobile saved"}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${student.paymentStatus === "APPROVED" ? "text-emerald-700" : student.paymentStatus === "REJECTED" ? "text-red-700" : "text-amber-700"}`}>
                          {student.paymentStatus === "APPROVED"
                            ? "Payment approved"
                            : student.paymentStatus === "REJECTED"
                              ? "Payment rejected"
                              : "Waiting for confirmation"}
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            student.refundStatus === "APPROVED"
                              ? "text-emerald-700"
                              : student.refundStatus === "REJECTED"
                                ? "text-red-700"
                                : student.refundStatus === "UNDER_REVIEW"
                                  ? "text-amber-700"
                                  : "text-ink-600"
                          }`}
                        >
                          Refund:{" "}
                          {student.refundStatus === "APPROVED"
                            ? "Approved"
                            : student.refundStatus === "REJECTED"
                              ? "Rejected"
                              : student.refundStatus === "UNDER_REVIEW"
                                ? "Under review"
                                : "Not eligible"}
                        </p>
                        <p className="text-sm font-semibold text-ink-900">Fee: ₹{student.courseFee}</p>
                        <p className="text-sm text-ink-600">Deposit: ₹{student.refundableDeposit}</p>
                        <p className="text-sm text-ink-600">Paid: ₹{student.totalPaid}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {student.selectedSubjects.map((subject) => (
                        <span key={subject} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700">
                          {subject}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {student.enrollments.map((enrollment) => (
                        <div key={enrollment.id} className="rounded-2xl border border-black/5 bg-white p-4">
                          <p className="font-semibold text-ink-900">{enrollment.subject}</p>
                          <p className="text-sm text-ink-600">Due date: {formatDate(enrollment.dueDate)}</p>
                          <p className="text-sm text-ink-600">Timeline: {enrollment.timelineDays} days</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
                      <p className="text-sm font-semibold text-ink-900">Recent submissions</p>
                      <div className="mt-3 space-y-2">
                        {student.submissions.length === 0 ? (
                          <p className="text-sm text-ink-500">No uploads yet.</p>
                        ) : (
                          student.submissions.map((submission) => (
                            <p key={submission.id} className="text-sm text-ink-600">
                              {submission.subject} - {submission.paperTitle} ({submission.status})
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => resetStudentPassword(student.id)}
                        className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStudent(student.id)}
                        className="ml-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"
                      >
                        Delete student and data
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-ink-900">Payment approvals</h3>
            <p className="mt-2 text-sm text-ink-600">
              Approve or reject UPI confirmations here. Approved students unlock their schedule in the student dashboard.
            </p>
            <div className="mt-6 grid gap-4">
              {students.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No student registrations yet.
                </div>
              ) : (
                students.map((student) => (
                  <article key={student.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink-900">
                          {[student.user.firstName, student.user.surname].filter(Boolean).join(" ") || "Student"}
                        </p>
                        <p className="text-xs text-ink-500">Student ID: {student.id}</p>
                        <p className="text-sm text-ink-600">{student.user.email}</p>
                        <p className="text-sm text-ink-600">{student.user.mobile ?? "No mobile saved"}</p>
                      </div>
                      <p className={`text-sm font-semibold ${student.paymentStatus === "APPROVED" ? "text-emerald-700" : student.paymentStatus === "REJECTED" ? "text-red-700" : "text-amber-700"}`}>
                        {student.paymentStatus === "APPROVED"
                          ? "Payment approved"
                          : student.paymentStatus === "REJECTED"
                            ? "Payment rejected"
                            : "Waiting for confirmation"}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updatePaymentStatus(student.id, "APPROVED")}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Approve payment
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePaymentStatus(student.id, "REJECTED")}
                        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"
                      >
                        Reject payment
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "refunds" ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-ink-900">Deposit refund approvals</h3>
            <p className="mt-2 text-sm text-ink-600">
              Review the student’s sincerity, submission history, and eligibility, then approve or reject the refundable deposit.
            </p>
            <div className="mt-6 grid gap-4">
              {refundReviewStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  No approved students are ready for refund review yet.
                </div>
              ) : (
                refundReviewStudents.map((student) => (
                  <article key={student.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink-900">
                          {[student.user.firstName, student.user.surname].filter(Boolean).join(" ") || "Student"}
                        </p>
                        <p className="text-xs text-ink-500">Student ID: {student.id}</p>
                        <p className="text-sm text-ink-600">{student.user.email}</p>
                        <p className="text-sm text-ink-600">{student.user.mobile ?? "No mobile saved"}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            student.refundStatus === "APPROVED"
                              ? "text-emerald-700"
                              : student.refundStatus === "REJECTED"
                                ? "text-red-700"
                                : student.refundStatus === "UNDER_REVIEW"
                                  ? "text-amber-700"
                                  : "text-ink-600"
                          }`}
                        >
                          {student.refundStatus === "APPROVED"
                            ? "Refund approved"
                            : student.refundStatus === "REJECTED"
                              ? "Refund rejected"
                              : student.refundStatus === "UNDER_REVIEW"
                                ? "Refund under review"
                                : "Not eligible"}
                        </p>
                        <p className="text-sm font-semibold text-ink-900">Deposit: ₹{student.refundableDeposit}</p>
                        <p className="text-sm text-ink-600">Sincerity score: {student.sincerityScore}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateRefundStatus(student.id, "UNDER_REVIEW")}
                        className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink-900"
                      >
                        Mark under review
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRefundStatus(student.id, "APPROVED")}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        Approve refund
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRefundStatus(student.id, "REJECTED")}
                        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"
                      >
                        Reject refund
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "reviews" ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-ink-900">Submission review queue</h3>
              <button onClick={() => refresh()} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink-900">
                Refresh
              </button>
            </div>
            <div className="mt-4 grid gap-4">
              {submissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-ink-50 p-4 text-sm text-ink-600">
                  Uploaded answer sheets will appear here.
                </div>
              ) : (
                  submissions.map((submission) => (
                    <article key={submission.id} className="rounded-2xl border border-black/5 bg-ink-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink-900">{submission.paperTitle}</p>
                          <p className="text-sm text-ink-600">{submission.subject}</p>
                          <p className="text-sm text-ink-600">
                            Student: {[submission.student?.user?.firstName, submission.student?.user?.surname].filter(Boolean).join(" ") || submission.student?.user?.email || "Student"}
                          </p>
                          <p className="text-xs text-ink-500">Student ID: {submission.studentId}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700">{submission.status}</span>
                      </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={submission.fileUrl} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-900">
                        Open uploaded answer
                      </a>
                      <a
                        href={submission.checkedAnswerUrl ?? "#"}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${
                          submission.checkedAnswerUrl ? "bg-amber-600 text-white" : "cursor-not-allowed bg-white text-ink-400"
                        }`}
                        onClick={(event) => {
                          if (!submission.checkedAnswerUrl) event.preventDefault();
                        }}
                      >
                        Checked copy
                      </a>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          uploadCheckedAnswer(submission.id, new FormData(event.currentTarget)).catch(() =>
                            setMessage("Checked answer upload failed.")
                          );
                        }}
                      >
                        <label className="block">
                          <span className="text-xs font-medium text-ink-700">Upload checked answer</span>
                          <input name="file" type="file" className="mt-2 rounded-2xl border border-black/10 bg-white px-4 py-3" />
                        </label>
                        <button type="submit" className="rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white">
                          Upload checked answer
                        </button>
                      </form>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-600">{submission.evaluatorNote ?? "No evaluator note yet."}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">{message}</p> : null}
    </div>
  );
}
