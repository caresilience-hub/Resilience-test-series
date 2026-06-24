"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";
import {
  calculateRegistrationPricing,
  calculateUnitTestPricing,
  formatCurrency,
  formatDateInput,
  parseDisplayDate,
  subjects,
  unitTestPaperOptions,
  unitTestSubjects
} from "@/lib/pricing";

type FormState = {
  firstName: string;
  surname: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullLengthSelections: string[];
  fullLengthDates: Record<string, string>;
  unitTestSelections: Record<string, { paper: string; date: string }[]>;
};

type Step = "details" | "upi";

function formatDateForPicker(value: string) {
  const parsed = parseDisplayDate(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getUnitTestLabel(subject: string, paperValue: string) {
  const option = unitTestPaperOptions[subject as keyof typeof unitTestPaperOptions]?.find(
    (item) => item.value === paperValue
  );

  return option ? `${subject} — ${option.label}` : subject;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [qrMissing, setQrMissing] = useState(false);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    surname: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullLengthSelections: [],
    fullLengthDates: {},
    unitTestSelections: Object.fromEntries(unitTestSubjects.map((subject) => [subject, [{ paper: "", date: "" }]]))
  });

  const mobileDigits = form.mobile.replace(/\D/g, "");
  const emailHasAt = form.email.includes("@");
  const passwordReady = form.password.length >= 8;
  const passwordsMatch = form.password === form.confirmPassword;
  const fullLengthCount = form.fullLengthSelections.length;
  const unitTestCount = Object.values(form.unitTestSelections).flat().filter((row) => Boolean(row.paper)).length;
  const fullLengthPricing = calculateRegistrationPricing(fullLengthCount);
  const unitTestPricing = calculateUnitTestPricing(unitTestCount);
  const totalCourseFee = fullLengthPricing.courseFee + unitTestPricing.courseFee;
  const totalRefundableDeposit = fullLengthPricing.refundableDeposit + unitTestPricing.refundableDeposit;
  const totalPayable = fullLengthPricing.totalPayable + unitTestPricing.totalPayable;
  const totalSelectedPapers = fullLengthCount + unitTestCount;

  const fullLengthSummaries = form.fullLengthSelections.map((subject) => ({
    label: subject,
    detail: formatDateInput(form.fullLengthDates[subject] || "") || "Date not set"
  }));

  const unitTestSummaries = unitTestSubjects
    .flatMap((subject) =>
      (form.unitTestSelections[subject] ?? [])
        .filter((row) => Boolean(row.paper))
        .map((row) => ({
          label: subject,
          detail: `${getUnitTestLabel(subject, row.paper)}${row.date ? ` • ${formatDateInput(row.date)}` : ""}`
        }))
    );

  const paperSummaries = [...fullLengthSummaries, ...unitTestSummaries];

  function getDetailsValidationMessage() {
    if (!form.firstName.trim()) return "Please enter your First Name.";
    if (!form.surname.trim()) return "Please enter your Last Name.";
    if (mobileDigits.length !== 10) return "Please enter a valid 10-digit Mobile Number.";
    if (!emailHasAt) return "Please enter a valid Email ID.";
    if (form.password.length < 8) return "Please create a password with at least 8 characters.";
    if (form.password !== form.confirmPassword) return "Your passwords do not match.";
    return "";
  }

  function getPaperValidationMessage() {
    if (totalSelectedPapers === 0) return "Please select at least one paper.";

    const missingDate = form.fullLengthSelections.find((subject) => !String(form.fullLengthDates[subject] ?? "").trim());
    if (missingDate) return `Please enter a paper date for ${missingDate}.`;

    const missingUnitTestPaper = unitTestSubjects.find((subject) =>
      (form.unitTestSelections[subject] ?? []).some((row) => !row.paper && String(row.date ?? "").trim())
    );
    if (missingUnitTestPaper) return `Please select a paper for ${missingUnitTestPaper} before choosing a date.`;

    const missingUnitTestDate = unitTestSubjects.find((subject) =>
      (form.unitTestSelections[subject] ?? []).some((row) => row.paper && !String(row.date ?? "").trim())
    );
    if (missingUnitTestDate) return `Please choose a date for the unit test selected under ${missingUnitTestDate}.`;

    return "";
  }

  function toggleFullLengthSubject(subject: string) {
    setForm((current) => {
      const isSelected = current.fullLengthSelections.includes(subject);
      const nextSelections = isSelected
        ? current.fullLengthSelections.filter((item) => item !== subject)
        : [...current.fullLengthSelections, subject];
      const nextDates = { ...current.fullLengthDates };

      if (isSelected) {
        delete nextDates[subject];
      }

      return {
        ...current,
        fullLengthSelections: nextSelections,
        fullLengthDates: nextDates
      };
    });
  }

  function addUnitTestRow(subject: string) {
    setForm((current) => ({
      ...current,
      unitTestSelections: {
        ...current.unitTestSelections,
        [subject]: [...(current.unitTestSelections[subject] ?? []), { paper: "", date: "" }]
      }
    }));
  }

  function updateUnitTestRow(subject: string, index: number, patch: Partial<{ paper: string; date: string }>) {
    setForm((current) => {
      const nextRows = [...(current.unitTestSelections[subject] ?? [])];
      nextRows[index] = { ...nextRows[index], ...patch };

      return {
        ...current,
        unitTestSelections: {
          ...current.unitTestSelections,
          [subject]: nextRows
        }
      };
    });
  }

  function removeUnitTestRow(subject: string, index: number) {
    setForm((current) => {
      const nextRows = [...(current.unitTestSelections[subject] ?? [])].filter((_, rowIndex) => rowIndex !== index);

      return {
        ...current,
        unitTestSelections: {
          ...current.unitTestSelections,
          [subject]: nextRows.length ? nextRows : [{ paper: "", date: "" }]
        }
      };
    });
  }

  async function submitForConfirmation() {
    const detailsMessage = getDetailsValidationMessage();
    if (detailsMessage) {
      setStatus(detailsMessage);
      setStep("details");
      return;
    }

    const paperMessage = getPaperValidationMessage();
    if (paperMessage) {
      setStatus(paperMessage);
      return;
    }

    setIsSubmitting(true);
    setStatus("Submitting your enrollment for admin confirmation...");

    const fullLengthSelections = form.fullLengthSelections.map((subject) => ({
      subject,
      date: form.fullLengthDates[subject]
    }));

    const unitTests = unitTestSubjects.flatMap((subject) =>
      (form.unitTestSelections[subject] ?? [])
        .filter((row) => Boolean(row.paper))
        .map((row) => ({
          subject,
          paper: row.paper,
          date: row.date,
          label: getUnitTestLabel(subject, row.paper)
        }))
    );

    try {
      const response = await fetch("/api/enrollments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          selectedSubjects: [
            ...fullLengthSelections.map((item) => item.subject),
            ...unitTests.map((item) => item.label)
          ],
          paperDates: Object.fromEntries(fullLengthSelections.map((item) => [item.subject, item.date])),
          paperSelections: {
            fullLength: fullLengthSelections,
            unitTests
          },
          pricing: {
            courseFee: totalCourseFee,
            refundableDeposit: totalRefundableDeposit,
            totalPayable
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.message ?? "Unable to submit your enrollment.");
        return;
      }

      setStatus("Waiting for admin confirmation...");
      window.setTimeout(() => {
        router.push("/student/dashboard");
      }, 900);
    } catch {
      setStatus("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SiteShell
      title="Create your disciplined test series plan"
      subtitle="Complete your registration, choose one or more papers, define each timeline, and submit your UPI confirmation for admin review."
      actions={<Badge>Live pricing calculator</Badge>}
    >
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-strong mx-auto w-full max-w-[460px] rounded-[1.75rem] p-5 sm:p-6 lg:mx-0 lg:max-w-none">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep("details")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                step === "details" ? "bg-ink-900 text-white" : "border border-black/10 bg-white text-ink-900"
              }`}
            >
              1. Details
            </button>
            <button
              type="button"
              onClick={() => {
                const detailsMessage = getDetailsValidationMessage();
                if (detailsMessage) {
                  setStatus(detailsMessage);
                  return;
                }

                const paperMessage = getPaperValidationMessage();
                if (paperMessage) {
                  setStatus(paperMessage);
                  return;
                }

                setStep("upi");
                setStatus("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                step === "upi" ? "bg-ink-900 text-white" : "border border-black/10 bg-white text-ink-900"
              }`}
            >
              2. UPI Payment
            </button>
          </div>

          {step === "details" ? (
            <>
              <h2 className="mt-5 text-lg font-semibold text-ink-900">Student details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { key: "firstName", label: "First Name", placeholder: "Enter first name" },
                  { key: "surname", label: "Last Name", placeholder: "Enter last name" },
                  { key: "mobile", label: "Mobile Number", placeholder: "9876543210" },
                  { key: "email", label: "Email ID", placeholder: "name@example.com" },
                  { key: "password", label: "Create Password", placeholder: "Minimum 8 characters", type: "password" },
                  { key: "confirmPassword", label: "Confirm Password", placeholder: "Re-enter password", type: "password" }
                ].map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">{field.label}</span>
                    <input
                      type={field.type ?? (field.key === "email" ? "email" : "text")}
                      inputMode={field.key === "mobile" ? "numeric" : undefined}
                      pattern={field.key === "mobile" ? "\\d{10}" : undefined}
                      maxLength={field.key === "mobile" ? 10 : undefined}
                      value={form[field.key as keyof FormState] as string}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]:
                            field.key === "mobile"
                              ? event.target.value.replace(/\D/g, "").slice(0, 10)
                              : event.target.value
                        }))
                      }
                      placeholder={field.placeholder}
                      required
                      minLength={field.key === "password" || field.key === "confirmPassword" ? 8 : undefined}
                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
                    />
                  </label>
                ))}
              </div>

              <h2 className="mt-7 text-lg font-semibold text-ink-900">Select papers</h2>
              <p className="mt-2 text-sm text-ink-600">Tick any combination of papers to calculate the fee automatically.</p>

              <div className="mt-4 space-y-4">
                <details open className="glass-soft overflow-hidden rounded-[1.5rem] border border-black/10 p-4">
                  <summary className="cursor-pointer list-none text-base font-semibold text-ink-900">
                    <span className="flex items-center justify-between gap-3">
                      <span>Full Length Mock Tests</span>
                      <span className="text-xs font-medium uppercase tracking-[0.24em] text-ink-500">Existing list</span>
                    </span>
                  </summary>
                  <div className="mt-4 space-y-2.5">
                    {subjects.map((subject) => {
                      const active = form.fullLengthSelections.includes(subject);
                      return (
                        <label
                          key={subject}
                          className={`grid gap-2.5 rounded-2xl border px-4 py-3.5 text-left transition sm:grid-cols-[auto_1fr_190px] sm:items-center ${
                            active ? "border-indigo-300 bg-indigo-50 shadow-soft" : "border-black/10 bg-white hover:border-ink-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleFullLengthSubject(subject)}
                              className="h-4 w-4 rounded border-black/20 accent-indigo-600"
                            />
                            <span className="text-sm font-semibold text-ink-900">{subject}</span>
                          </div>
                          <p className="text-sm text-ink-500">Choose the date on which you will give this paper.</p>
                          <input
                            type="date"
                            value={formatDateForPicker(form.fullLengthDates[subject] ?? "")}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                fullLengthDates: {
                                  ...current.fullLengthDates,
                                  [subject]: event.target.value
                                }
                              }))
                            }
                            disabled={!active}
                            required={active}
                            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
                          />
                        </label>
                      );
                    })}
                  </div>
                </details>

                <details open className="glass-soft overflow-hidden rounded-[1.5rem] border border-black/10 p-4">
                  <summary className="cursor-pointer list-none text-base font-semibold text-ink-900">
                    <span className="flex items-center justify-between gap-3">
                      <span>Unit tests (50 marks each)</span>
                      <span className="text-xs font-medium uppercase tracking-[0.24em] text-ink-500">Paper options</span>
                    </span>
                  </summary>
              <div className="mt-4 space-y-3">
                    {unitTestSubjects.map((subject) => {
                      const selectedRows = form.unitTestSelections[subject] ?? [];
                      return (
                        <div key={subject} className="rounded-2xl border border-black/10 bg-white px-4 py-4 transition hover:border-ink-300">
                          <div className="grid gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink-900">{subject}</p>
                              <p className="mt-1 text-sm text-ink-500">Choose any number of papers and set a date for each one.</p>
                            </div>
                            <div className="space-y-3">
                              {selectedRows.map((row, index) => (
                                <div key={`${subject}-${index}`} className="grid gap-3 rounded-2xl border border-black/10 bg-ink-50 p-3 lg:grid-cols-[1fr_170px_auto] lg:items-end">
                                  <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">Select paper</span>
                                    <select
                                      value={row.paper}
                                      onChange={(event) =>
                                        updateUnitTestRow(subject, index, {
                                          paper: event.target.value
                                        })
                                      }
                                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400"
                                    >
                                      <option value="">Choose paper</option>
                                      {unitTestPaperOptions[subject].map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">Paper date</span>
                                    <input
                                      type="date"
                                      value={formatDateForPicker(row.date)}
                                      onChange={(event) =>
                                        updateUnitTestRow(subject, index, {
                                          date: event.target.value
                                        })
                                      }
                                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeUnitTestRow(subject, index)}
                                    className="inline-flex h-fit items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addUnitTestRow(subject)}
                                className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                              >
                                Add another paper
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>

              <p className="mt-4 text-sm text-ink-600">
                If you want customized tests, mail us at{" "}
                <a href="mailto:caresilience@gmail.com" className="font-semibold text-ink-900 underline decoration-indigo-300 underline-offset-4">
                  caresilience@gmail.com
                </a>
              </p>
            </>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-indigo-200 bg-indigo-50 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-indigo-700">UPI payment</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                Scan the QR code below with any UPI app, then submit this enrollment for admin confirmation.
              </p>
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
                {qrMissing ? (
                  <div className="rounded-[1.25rem] border border-dashed border-indigo-300 bg-indigo-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-indigo-900">Add your QR image</p>
                    <p className="mt-1 text-sm text-indigo-800">Place the scanner file at <code>/public/upi-qr.png</code> to show it here.</p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <img
                      src="/upi-qr.png"
                      alt="UPI QR code for student confirmation"
                      className="w-full max-w-[24rem] rounded-[1.25rem] object-contain"
                      onError={() => setQrMissing(true)}
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-ink-500">Amount to transfer</p>
                <p className="mt-2 text-3xl font-semibold text-ink-900">{formatCurrency(totalPayable)}</p>
              </div>
              <p className="mt-4 text-sm text-ink-600">
                Once you submit, your dashboard will show <span className="font-semibold text-ink-900">waiting for payment confirmation</span> until an admin approves it.
              </p>
            </div>
          )}
        </section>

        <aside className="glass-strong h-fit rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink-900">Order summary</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-ink-900 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.26em] text-white/70">Selected papers</p>
              <p className="mt-2 text-2xl font-semibold">{totalSelectedPapers}</p>
              <p className="mt-1 text-xs text-white/70">
                {fullLengthCount} full length • {unitTestCount} unit tests
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-ink-500">Course fee</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">{formatCurrency(totalCourseFee)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-ink-500">Refundable deposit</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{formatCurrency(totalRefundableDeposit)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-indigo-700">Total payable</p>
              <p className="mt-2 text-3xl font-semibold text-ink-900">{formatCurrency(totalPayable)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">Selected paper details</p>
              <div className="mt-3 space-y-2">
                {paperSummaries.length === 0 ? (
                  <p className="text-sm text-ink-500">No papers selected yet.</p>
                ) : (
                  paperSummaries.map((item) => (
                    <div key={`${item.label}-${item.detail}`} className="rounded-xl bg-ink-50 px-3 py-2">
                      <p className="text-sm font-medium text-ink-900">{item.label}</p>
                      <p className="text-sm text-ink-600">{item.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {status ? <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">{status}</p> : null}

          <div className="mt-6 space-y-3">
            {step === "details" ? (
              <button
                type="button"
                onClick={() => {
                  const detailsMessage = getDetailsValidationMessage();
                  if (detailsMessage) {
                    setStatus(detailsMessage);
                    return;
                  }

                  const paperMessage = getPaperValidationMessage();
                  if (paperMessage) {
                    setStatus(paperMessage);
                    return;
                  }

                  setStep("upi");
                  setStatus("");
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-ink-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Open UPI tab
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={submitForConfirmation}
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-full bg-ink-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Submit for confirmation"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-ink-900 transition hover:bg-ink-50"
                >
                  Back to details
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
