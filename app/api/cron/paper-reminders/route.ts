import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmailNotification } from "@/lib/notifications";
import { formatDate, normalizeSubjectName } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_TIME_ZONE = process.env.REMINDER_TIME_ZONE ?? "Asia/Kolkata";
const REMINDER_TIME_ZONE_OFFSET_MINUTES = Number(process.env.REMINDER_TIME_ZONE_OFFSET_MINUTES ?? "330");
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "caresilience@gmail.com";
const CRON_SECRET = process.env.REMINDER_CRON_SECRET?.trim();

function getLocalDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? date.getUTCFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? date.getUTCMonth() + 1);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? date.getUTCDate());
  return { year, month, day };
}

function getTomorrowWindow() {
  const { year, month, day } = getLocalDateParts(new Date(), REMINDER_TIME_ZONE);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  const tomorrowKey = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
  const start = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 0, 0, 0) - REMINDER_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end, tomorrowKey };
}

function buildStudentReminderMessage(studentName: string, papers: Array<{ subject: string; dueDate: Date }>) {
  const lines = papers
    .map((paper) => `- ${normalizeSubjectName(paper.subject)} | Due: ${formatDate(paper.dueDate)}`)
    .join("\n");

  return [
    `Hi ${studentName},`,
    "",
    "This is a friendly reminder that the following paper(s) are due tomorrow:",
    lines,
    "",
    `Open your dashboard here: ${APP_URL}/student/dashboard`,
    "",
    "If you need support, reply to this email or write to caresilience@gmail.com.",
    "",
    "— CA Resilience Test Series"
  ].join("\n");
}

function buildAdminReminderMessage(items: Array<{ studentName: string; studentEmail: string; subject: string; dueDate: Date }>) {
  const lines = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.studentName} <${item.studentEmail}> — ${normalizeSubjectName(item.subject)} | Due: ${formatDate(item.dueDate)}`
    )
    .join("\n");

  return [
    "Hi Admin,",
    "",
    "These paper(s) are due tomorrow:",
    lines,
    "",
    `Open the admin dashboard here: ${APP_URL}/admin/dashboard`,
    "",
    "— CA Resilience Test Series"
  ].join("\n");
}

function isCronRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  if (request.headers.has("x-vercel-cron")) {
    return true;
  }

  if (CRON_SECRET) {
    const token = request.nextUrl.searchParams.get("token") ?? request.headers.get("x-cron-secret");
    return token === CRON_SECRET;
  }

  return false;
}

async function createReminderLog(
  dedupeKey: string,
  data: {
    kind: string;
    reminderDay: string;
    recipientEmail: string;
    subject: string;
    studentId?: string | null;
    enrollmentId?: string | null;
  }
) {
  try {
    await prisma.reminderLog.create({
      data: {
        dedupeKey,
        kind: data.kind,
        reminderDay: data.reminderDay,
        recipientEmail: data.recipientEmail,
        subject: data.subject,
        studentId: data.studentId ?? undefined,
        enrollmentId: data.enrollmentId ?? undefined
      }
    });
    return true;
  } catch (error: any) {
    if (error?.code === "P2002") {
      return false;
    }
    throw error;
  }
}

async function deleteReminderLog(dedupeKey: string) {
  await prisma.reminderLog.delete({ where: { dedupeKey } }).catch(() => null);
}

async function runReminderJob() {
  const { start, end, tomorrowKey } = getTomorrowWindow();

  const dueTomorrowEnrollments = await prisma.enrollment.findMany({
    where: {
      dueDate: {
        gte: start,
        lt: end
      },
      student: {
        paymentStatus: PaymentStatus.APPROVED
      }
    },
    select: {
      id: true,
      subject: true,
      dueDate: true,
      student: {
        select: {
          id: true,
          user: {
            select: {
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      }
    },
    orderBy: [{ dueDate: "asc" }, { subject: "asc" }]
  });

  if (!dueTomorrowEnrollments.length) {
    return {
      studentEmailsSent: 0,
      studentEmailsSkipped: 0,
      adminEmailSent: false,
      adminEmailSkipped: false,
      dueTomorrowCount: 0,
      reminderDay: tomorrowKey
    };
  }

  const groupedByStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      studentEmail: string;
      papers: Array<{ enrollmentId: string; subject: string; dueDate: Date }>;
    }
  >();

  for (const enrollment of dueTomorrowEnrollments) {
    const studentName = [enrollment.student.user.firstName, enrollment.student.user.surname].filter(Boolean).join(" ") || "Student";
    const studentEmail = enrollment.student.user.email;
    const groupKey = enrollment.student.id;
    const group = groupedByStudent.get(groupKey) ?? {
      studentId: enrollment.student.id,
      studentName,
      studentEmail,
      papers: []
    };

    group.papers.push({
      enrollmentId: enrollment.id,
      subject: enrollment.subject,
      dueDate: enrollment.dueDate
    });
    groupedByStudent.set(groupKey, group);
  }

  const results = {
    studentEmailsSent: 0,
    studentEmailsSkipped: 0,
    adminEmailSent: false,
    adminEmailSkipped: false,
    dueTomorrowCount: dueTomorrowEnrollments.length,
    reminderDay: tomorrowKey
  };

  for (const group of groupedByStudent.values()) {
    const createdKeys: string[] = [];
    for (const paper of group.papers) {
      const dedupeKey = `student:${group.studentId}:enrollment:${paper.enrollmentId}:day:${tomorrowKey}`;
      const created = await createReminderLog(dedupeKey, {
        kind: "STUDENT_NEXT_DAY",
        reminderDay: tomorrowKey,
        recipientEmail: group.studentEmail,
        subject: `Reminder: ${normalizeSubjectName(paper.subject)} is due tomorrow`,
        studentId: group.studentId,
        enrollmentId: paper.enrollmentId
      });
      if (created) {
        createdKeys.push(dedupeKey);
      }
    }

    if (!createdKeys.length) {
      results.studentEmailsSkipped += 1;
      continue;
    }

    try {
      await sendEmailNotification({
        to: group.studentEmail,
        subject:
          group.papers.length === 1
            ? `Reminder: ${normalizeSubjectName(group.papers[0].subject)} is due tomorrow`
            : `Reminder: ${group.papers.length} papers are due tomorrow`,
        message: buildStudentReminderMessage(group.studentName, group.papers)
      });
      results.studentEmailsSent += 1;
    } catch (error) {
      for (const key of createdKeys) {
        await deleteReminderLog(key);
      }
      throw error;
    }
  }

  const adminDedupeKey = `admin:day:${tomorrowKey}`;
  const adminCreated = await createReminderLog(adminDedupeKey, {
    kind: "ADMIN_NEXT_DAY",
    reminderDay: tomorrowKey,
    recipientEmail: ADMIN_EMAIL,
    subject: `Tomorrow's paper reminders (${dueTomorrowEnrollments.length})`
  });

  if (adminCreated) {
    try {
      await sendEmailNotification({
        to: ADMIN_EMAIL,
        subject: `Tomorrow's paper reminders (${dueTomorrowEnrollments.length})`,
        message: buildAdminReminderMessage(
          dueTomorrowEnrollments.map((enrollment) => ({
            studentName: [enrollment.student.user.firstName, enrollment.student.user.surname].filter(Boolean).join(" ") || "Student",
            studentEmail: enrollment.student.user.email,
            subject: enrollment.subject,
            dueDate: enrollment.dueDate
          }))
        )
      });
      results.adminEmailSent = true;
    } catch (error) {
      await deleteReminderLog(adminDedupeKey);
      throw error;
    }
  } else {
    results.adminEmailSkipped = true;
  }

  return results;
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderJob();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderJob();
  return NextResponse.json(result);
}
