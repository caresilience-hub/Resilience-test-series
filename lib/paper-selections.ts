import { normalizeSubjectName } from "@/lib/pricing";

export type FullLengthPaperSelection = {
  subject: string;
  date: string;
};

export type UnitTestPaperSelection = {
  subject: string;
  paper: string;
  date: string;
  label: string;
};

export type NormalizedPaperSelections = {
  fullLength: FullLengthPaperSelection[];
  unitTests: UnitTestPaperSelection[];
  selectedSubjects: string[];
  paperDates: Record<string, string>;
};

type RawSelectionItem = {
  subject?: string;
  date?: string;
  dueDate?: string;
  paper?: string;
  label?: string;
  paperLabel?: string;
};

function toSelectionArray(value: unknown): RawSelectionItem[] {
  return Array.isArray(value) ? value.filter(Boolean) as RawSelectionItem[] : [];
}

function buildUnitTestLabel(subject: string, paper: string, label?: string) {
  const cleanedSubject = normalizeSubjectName(subject);
  const cleanedPaper = String(paper ?? "").trim();
  const cleanedLabel = String(label ?? "").trim();

  if (cleanedLabel) {
    return cleanedLabel;
  }

  if (cleanedPaper) {
    return `${cleanedSubject} - ${cleanedPaper}`;
  }

  return cleanedSubject;
}

function normalizeFullLengthSelection(item: RawSelectionItem): FullLengthPaperSelection {
  const subject = normalizeSubjectName(String(item.subject ?? "").trim());
  const date = String(item.date ?? item.dueDate ?? "").trim();

  return { subject, date };
}

function normalizeUnitTestSelection(item: RawSelectionItem): UnitTestPaperSelection {
  const subject = normalizeSubjectName(String(item.subject ?? "").trim());
  const paper = String(item.paper ?? "").trim();
  const date = String(item.date ?? item.dueDate ?? "").trim();
  const label = buildUnitTestLabel(subject, paper, item.label ?? item.paperLabel);

  return { subject, paper, date, label };
}

export function parsePaperSelections(body: unknown): NormalizedPaperSelections {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const structured = source.paperSelections && typeof source.paperSelections === "object" ? (source.paperSelections as Record<string, unknown>) : null;

  if (structured) {
    const fullLength = toSelectionArray(structured.fullLength).map(normalizeFullLengthSelection);
    const unitTests = toSelectionArray(structured.unitTests).map(normalizeUnitTestSelection);

    return {
      fullLength,
      unitTests,
      selectedSubjects: [
        ...fullLength.filter((item) => Boolean(item.subject)).map((item) => item.subject),
        ...unitTests.filter((item) => Boolean(item.subject && item.paper)).map((item) => item.label)
      ],
      paperDates: Object.fromEntries([
        ...fullLength.filter((item) => Boolean(item.subject && item.date)).map((item) => [item.subject, item.date]),
        ...unitTests.filter((item) => Boolean(item.subject && item.paper && item.date)).map((item) => [item.label, item.date])
      ])
    };
  }

  const selectedSubjects = Array.isArray(source.selectedSubjects)
    ? source.selectedSubjects.map((value) => normalizeSubjectName(String(value).trim())).filter(Boolean)
    : [];

  const paperDates = source.paperDates && typeof source.paperDates === "object" && !Array.isArray(source.paperDates)
    ? (source.paperDates as Record<string, unknown>)
    : {};

  const fullLength = selectedSubjects
    .map((subject) => {
      const date = String(paperDates[subject] ?? "").trim();
      return { subject, date };
    })
    .filter((item) => Boolean(item.subject)) as FullLengthPaperSelection[];

  return {
    fullLength,
    unitTests: [],
    selectedSubjects,
    paperDates: Object.fromEntries(fullLength.map((item) => [item.subject, item.date]))
  };
}
