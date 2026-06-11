import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePublicUpload } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function DELETE(_: NextRequest, context: any) {
  const { id } = context.params as { id: string };

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      submissions: {
        select: {
          fileUrl: true,
          checkedAnswerUrl: true
        }
      }
    }
  });

  if (!student) {
    return NextResponse.json({ message: "Student not found." }, { status: 404 });
  }

  await prisma.user.delete({
    where: { id: student.userId }
  });

  const uploadUrls = new Set<string>();
  for (const submission of student.submissions) {
    if (submission.fileUrl) uploadUrls.add(submission.fileUrl);
    if (submission.checkedAnswerUrl) uploadUrls.add(submission.checkedAnswerUrl);
  }

  await Promise.all(
    Array.from(uploadUrls).map(async (fileUrl) => {
      try {
        await deletePublicUpload(fileUrl);
      } catch {
        // Best-effort cleanup only; the database record has already been removed.
      }
    })
  );

  return NextResponse.json({ deleted: true, studentId: student.id });
}
