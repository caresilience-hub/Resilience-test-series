import { NextRequest, NextResponse } from "next/server";
import { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { savePublicUpload } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: any) {
  const formData = await request.formData();
  const file = formData.get("file");
  const params = context.params as { id: string };

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "checked answer file is required." }, { status: 400 });
  }

  const checkedAnswerUrl = await savePublicUpload(file, ["checked", params.id]);

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: {
      checkedAnswerUrl,
      checkedAt: new Date(),
      status: SubmissionStatus.EVALUATED
    }
  });

  return NextResponse.json({ submission, checkedAnswerUrl });
}
