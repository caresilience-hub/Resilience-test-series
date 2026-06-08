import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePublicUpload } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const papers = await prisma.subjectPaper.findMany({ orderBy: { publishedAt: "desc" } });
  return NextResponse.json({ papers });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const rawKind = String(formData.get("kind") ?? "question-paper").trim();
  const kind = rawKind.toLowerCase().replace(/\s+/g, "-") || "question-paper";
  const marks = Number(formData.get("marks") ?? 100);
  const file = formData.get("file");

  if (!subject || !title || !(file instanceof File)) {
    return NextResponse.json({ message: "subject, title, and file are required." }, { status: 400 });
  }

  const fileUrl = await savePublicUpload(file, ["library", kind]);
  const paper = await prisma.subjectPaper.create({
    data: {
      subject,
      title,
      kind,
      fileUrl,
      sampleAnswerUrl: kind === "answer-sheet" ? fileUrl : null,
      marks: Number.isFinite(marks) ? marks : 100
    }
  });

  return NextResponse.json({ paper }, { status: 201 });
}
