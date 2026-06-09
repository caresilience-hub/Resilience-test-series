"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui";
import { calculateRegistrationPricing, formatCurrency, formatDateInput, subjects } from "@/lib/pricing";

type FormState = {
  firstName: string;
  surname: string;
  mobile: string;
  email: string;
  selectedSubjects: string[];
  paperDates: Record<string, string>;
};

type Step = "details" | "upi";

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
    selectedSubjects: [],
    paperDates: {}
  });

  const pricing = calculateRegistrationPricing(form.selectedSubjects.length);
  const mobileDigits = form.mobile.replace(/\D/g, "");
  const emailHasAt = form.email.includes("@");
  const detailsComplete = Boolean(
    form.firstName.trim() &&
      form.surname.trim() &&
      mobileDigits.length === 10 &&
      emailHasAt
  );
  const canProceed = form.selectedSubjects.length > 0 && form.selectedSubjects.every((subject) => Boolean(form.paperDates[subject]));

  function toggleSubject(subject: string) {
    setForm((current) => {
      const selected = current.selectedSubjects.includes(subject)
        ? current.selectedSubjects.filter((item) => item !== subject)
        : [...current.selectedSubjects, subject];

      const paperDates = { ...current.paperDates };
      if (!selected.includes(subject)) {
        delete paperDates[subject];
      }

      return {
        ...current,
        selectedSubjects: selected,
        paperDates
      };
    });
  }

  async function submitForConfirmation() {
    if (!canProceed) {
      setStatus("Please select a paper and enter a date for every selected paper before continuing.");
      return;
    }

    if (!detailsComplete) {
      setStatus("Please enter a 10-digit contact number and a valid email address before submitting.");
      setStep("details");
      return;
    }

    setIsSubmitting(true);
    setStatus("Submitting your enrollment for admin confirmation...");

    try {
      const response = await fetch("/api/enrollments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricing
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
                if (detailsComplete && canProceed) {
                  setStep("upi");
                  setStatus("");
                } else {
                  setStatus(
                    detailsComplete
                      ? "Please select papers and set dates before opening the UPI tab."
                      : "Please complete First Name, Last Name, Mobile Number, and Email ID before opening the UPI tab."
                  );
                }
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
                  { key: "email", label: "Email ID", placeholder: "name@example.com" }
                ].map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">{field.label}</span>
                    <input
                      type={field.key === "email" ? "email" : "text"}
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
                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white"
                    />
                  </label>
                ))}
              </div>

              <h2 className="mt-7 text-lg font-semibold text-ink-900">Select papers</h2>
              <p className="mt-2 text-sm text-ink-600">Tick any combination of papers to calculate the fee automatically.</p>
              <div className="mt-4 space-y-2.5">
                {subjects.map((subject) => {
                  const active = form.selectedSubjects.includes(subject);
                  return (
                    <label
                      key={subject}
                      className={`grid gap-2.5 rounded-2xl border px-4 py-3.5 text-left transition sm:grid-cols-[auto_1fr_190px] sm:items-center ${
                        active
                          ? "border-amber-300 bg-amber-50 shadow-soft"
                          : "border-black/10 bg-white hover:border-ink-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleSubject(subject)}
                          className="h-4 w-4 rounded border-black/20 accent-amber-600"
                        />
                        <span className="text-sm font-semibold text-ink-900">{subject}</span>
                      </div>
                      <p className="text-sm text-ink-500">Choose the date on which you will give this paper.</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}"
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                        value={form.paperDates[subject] ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            paperDates: {
                              ...current.paperDates,
                              [subject]: event.target.value.replace(/[^\d/]/g, "")
                            }
                          }))
                        }
                        disabled={!active}
                        required={active}
                        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
                      />
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-800">UPI payment</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                Scan the QR code below with any UPI app, then submit this enrollment for admin confirmation.
              </p>
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
                {qrMissing ? (
                  <div className="rounded-[1.25rem] border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-amber-900">Add your QR image</p>
                    <p className="mt-1 text-sm text-amber-800">Place the scanner file at <code>/public/upi-qr.png</code> to show it here.</p>
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
                <p className="mt-2 text-3xl font-semibold text-ink-900">{formatCurrency(pricing.totalPayable)}</p>
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
              <p className="mt-2 text-2xl font-semibold">{pricing.count}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-ink-500">Course fee</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">{formatCurrency(pricing.courseFee)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-ink-500">Refundable deposit</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{formatCurrency(pricing.refundableDeposit)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-amber-800">Total payable</p>
              <p className="mt-2 text-3xl font-semibold text-ink-900">{formatCurrency(pricing.totalPayable)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">Selected paper dates</p>
              <div className="mt-3 space-y-2">
                {form.selectedSubjects.length === 0 ? (
                  <p className="text-sm text-ink-500">No papers selected yet.</p>
                ) : (
                  form.selectedSubjects.map((subject) => (
                    <p key={subject} className="text-sm text-ink-600">
                      {subject}: {formatDateInput(form.paperDates[subject] || "") || "Date not set"}
                    </p>
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
                  if (canProceed) {
                    setStep("upi");
                    setStatus("");
                  } else {
                    setStatus("Please select papers and dates before opening the UPI tab.");
                  }
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
