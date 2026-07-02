export const subjects = [
  "Financial Reporting",
  "Advanced Financial Management",
  "Advanced Auditing, Assurance & Professional Ethics",
  "Direct Tax Laws & International Taxation",
  "Indirect Tax Laws",
  "Integrated Business Solutions"
] as const;

export const unitTestSubjects = [
  "Financial Reporting",
  "Advanced Financial Management",
  "Advanced Auditing, Assurance & Professional Ethics",
  "Direct Tax Laws & International Taxation",
  "Indirect Tax Laws"
] as const;

export type SubjectName = (typeof subjects)[number];
export type UnitTestSubjectName = (typeof unitTestSubjects)[number];

export const unitTestPaperOptions: Record<UnitTestSubjectName, { value: string; label: string }[]> = {
  "Financial Reporting": [
    { value: "paper-1", label: "Paper 1 - Module 1, 2 and 3" },
    { value: "paper-2", label: "Paper 2 - Module 4" },
    { value: "paper-3", label: "Paper 3 - Module 5" }
  ],
  "Advanced Financial Management": [
    { value: "paper-1", label: "Paper 1 - Chapter 1-5" },
    { value: "paper-2", label: "Paper 2 - Chapter 6-9" },
    { value: "paper-3", label: "Paper 3 - Chapter 10-15" }
  ],
  "Advanced Auditing, Assurance & Professional Ethics": [
    { value: "paper-1", label: "Paper 1 - Module 1" },
    { value: "paper-2", label: "Paper 2 - Module 2" },
    { value: "paper-3", label: "Paper 3 - Module 3" }
  ],
  "Direct Tax Laws & International Taxation": [
    { value: "paper-1", label: "Paper 1 - Module 1" },
    { value: "paper-2", label: "Paper 2 - Module 2" },
    { value: "paper-3", label: "Paper 3 - Module 3 & 4" }
  ],
  "Indirect Tax Laws": [
    { value: "paper-1", label: "Paper 1 - Module 1" },
    { value: "paper-2", label: "Paper 2 - Module 2" },
    { value: "paper-3", label: "Paper 3 - Module 3 & 4" }
  ]
};

export type PricingPlan = {
  subjects: number;
  courseFee: number;
  refundableDeposit: number;
};

const subjectAliases: Record<string, string> = {
  "Financial Management": "Advanced Financial Management",
  "Advanced financial Management": "Advanced Financial Management",
  "Audit": "Advanced Auditing, Assurance & Professional Ethics",
  "Direct Tax": "Direct Tax Laws & International Taxation",
  "Indirect Tax": "Indirect Tax Laws",
  "IBS": "Integrated Business Solutions"
};

export function normalizeSubjectName(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  return subjectAliases[trimmed] ?? trimmed;
}

export function normalizeSubjectList(values: string[]) {
  return values.map((value) => normalizeSubjectName(value));
}

export const pricingTable: PricingPlan[] = [
  { subjects: 1, courseFee: 199, refundableDeposit: 500 },
  { subjects: 2, courseFee: 399, refundableDeposit: 500 },
  { subjects: 3, courseFee: 599, refundableDeposit: 500 },
  { subjects: 4, courseFee: 799, refundableDeposit: 1000 },
  { subjects: 5, courseFee: 999, refundableDeposit: 1000 },
  { subjects: 6, courseFee: 1199, refundableDeposit: 1000 }
];

export function calculatePlan(selectedCount: number) {
  const count = Math.min(Math.max(selectedCount, 1), 6);
  return pricingTable.find((plan) => plan.subjects === count) ?? pricingTable[2];
}

export function calculateRegistrationPricing(selectedCount: number) {
  const count = Math.min(Math.max(selectedCount, 0), 6);

  if (count === 0) {
    return {
      count,
      courseFee: 0,
      refundableDeposit: 0,
      totalPayable: 0
    };
  }

  const courseFee = count * 200 - 1;
  const refundableDeposit = count <= 3 ? 500 : 1000;

  return {
    count,
    courseFee,
    refundableDeposit,
    totalPayable: courseFee + refundableDeposit
  };
}

export function calculateUnitTestPricing(selectedCount: number) {
  const count = Math.max(selectedCount, 0);

  if (count === 0) {
    return {
      count,
      courseFee: 0,
      refundableDeposit: 0,
      totalPayable: 0
    };
  }

  const courseFee = count * 150 - 1;
  const refundableDeposit = count <= 3 ? 500 : 1000;

  return {
    count,
    courseFee,
    refundableDeposit,
    totalPayable: courseFee + refundableDeposit
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(date: Date | string) {
  const value = new Date(date);
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear());

  return `${day}/${month}/${year}`;
}

export function parseDisplayDate(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const ddmmyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateInput(value: string) {
  const parsed = parseDisplayDate(value);
  return parsed ? formatDate(parsed) : value;
}
