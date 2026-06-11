import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRoleFromRequest, readSessionFromRequest } from "@/lib/authorization";
import { calculateEligibility } from "@/lib/business";
import { formatDate } from "@/lib/pricing";
import { parsePaperTimelines, parseSelectedSubjects } from "@/lib/student-state";

function normalizeKind(kind?: string | null) {
  return kind?.toLowerCase().trim().replace(/\s+/g, "-") ?? "";
}

export async function GET(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const session = readSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      userId: true,
      selectedSubjects: true,
      subjectTimelines: true,
      courseFee: true,
      refundableDeposit: true,
      totalPaid: true,
      paymentStatus: true,
      refundStatus: true,
      sincerityScore: true,
      user: {
        select: {
          id: true,
          firstName: true,
          surname: true,
          mobile: true,
          email: true
        }
      },
      enrollments: true,
      submissions: { orderBy: { createdAt: "desc" } },
      paperAccesses: {
        select: {
          id: true,
          canDownloadPaper: true,
          canDownloadAnswer: true,
          subjectPaper: {
            select: {
              id: true,
              subject: true,
              title: true,
              kind: true,
              fileUrl: true,
              sampleAnswerUrl: true
            }
          }
        }
      }
    }
  });

  if (!student) {
    return NextResponse.json({
      studentName: "Student",
      plan: { courseFee: 0, refundableDeposit: 0 },
      subjects: [],
      eligibility: calculateEligibility(0, false, false),
      upcomingPapers: [],
      schedule: [],
      submissions: [],
      grantedPapers: [],
      refundStatus: "NOT_ELIGIBLE",
      paymentStatus: "WAITING_CONFIRMATION",
      lastUpdated: new Date().toISOString()
    });
  }

  const deadlineMet = student.enrollments.every((enrollment: { dueDate: Date }) => enrollment.dueDate >= new Date());
  const eligibility = calculateEligibility(student.sincerityScore, deadlineMet, student.refundStatus === "APPROVED" || student.sincerityScore >= 80);

  const subjectTimelines = parsePaperTimelines(student.subjectTimelines);
  const selectedSubjects = parseSelectedSubjects(student.selectedSubjects);

  const upcomingPapers = student.enrollments.length
    ? student.enrollments.map((enrollment: { subject: string; dueDate: Date }) => ({
        subject: enrollment.subject,
        title: `${enrollment.subject} Paper`,
        dueIn: `${Math.max(0, Math.ceil((enrollment.dueDate.getTime() - Date.now()) / 86400000))} days`
      }))
    : selectedSubjects.map((subject: string) => ({
        subject,
        title: `${subject} Paper`,
        dueIn: `${subjectTimelines?.[subject] ?? 0} days`
      }));

  const now = new Date();
  const schedule = student.enrollments.map((enrollment: { id: string; subject: string; dueDate: Date }) => ({
    id: enrollment.id,
    subject: enrollment.subject,
    title: `${enrollment.subject} Paper`,
    dueDate: enrollment.dueDate.toISOString(),
    dueDateLabel: formatDate(enrollment.dueDate),
    dueIn: `${Math.max(0, Math.ceil((enrollment.dueDate.getTime() - now.getTime()) / 86400000))} days`,
    canUpload: student.paymentStatus === "APPROVED" && enrollment.dueDate.getTime() <= now.getTime()
  }));

  const grantedPapers = student.paperAccesses.map((grant: any) => ({
    id: grant.subjectPaper.id,
    subject: grant.subjectPaper.subject,
    title: grant.subjectPaper.title,
    kind: normalizeKind(grant.subjectPaper.kind) || grant.subjectPaper.kind,
    fileUrl: grant.canDownloadPaper && normalizeKind(grant.subjectPaper.kind) !== "answer-sheet" ? grant.subjectPaper.fileUrl : null,
    sampleAnswerUrl:
      grant.canDownloadAnswer
        ? grant.subjectPaper.sampleAnswerUrl ?? (normalizeKind(grant.subjectPaper.kind) === "answer-sheet" ? grant.subjectPaper.fileUrl : null)
        : null,
    canDownloadPaper: grant.canDownloadPaper && normalizeKind(grant.subjectPaper.kind) !== "answer-sheet",
    canDownloadAnswer: grant.canDownloadAnswer
  }));

  return NextResponse.json({
    studentName: [student.user.firstName, student.user.surname].filter(Boolean).join(" ") || "Student",
    plan: {
      courseFee: student.courseFee,
      refundableDeposit: student.refundableDeposit
    },
    subjects: selectedSubjects,
    eligibility,
    upcomingPapers,
    schedule,
    submissions: student.submissions,
    grantedPapers,
    refundStatus: student.refundStatus,
    paymentStatus: student.paymentStatus,
    lastUpdated: new Date().toISOString()
  });
}
