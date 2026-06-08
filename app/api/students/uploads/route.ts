import { NextRequest, NextResponse } from "next/server";
import { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readRoleFromRequest } from "@/lib/authorization";
import { savePublicUpload } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const formData = await request.formData();
  const studentId = String(formData.get("studentId") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const paperTitle = String(formData.get("paperTitle") ?? "");
  const file = formData.get("file");

  if (!studentId || !subject || !paperTitle || !file || !(file instanceof File)) {
    return NextResponse.json({ message: "studentId, subject, paperTitle, and file are required." }, { status: 400 });
  }

  const fileUrl = await savePublicUpload(file, ["uploads", studentId]);

  const submission = await prisma.submission.create({
    data: {
      studentId,
      subject,
      paperTitle,
      fileUrl,
      status: SubmissionStatus.SUBMITTED
    }
  });

  return NextResponse.json({
    ok: true,
    fileUrl,
    submission
  });
}
