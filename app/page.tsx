import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge, PrimaryButton, SectionHeading } from "@/components/ui";
import { faqs, landingStats, testimonials } from "@/lib/mock-data";
import { formatCurrency, pricingTable } from "@/lib/pricing";
import { getMetadataBase } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Resilience CA Final Test Series | Expert Evaluation & Mentorship",
  description:
    "Affordable CA Final test series with detailed evaluation, expert feedback, mentorship and personalized guidance.",
  openGraph: {
    title: "Resilience CA Final Test Series | Expert Evaluation & Mentorship",
    description:
      "Affordable CA Final test series with detailed evaluation, expert feedback, mentorship and personalized guidance.",
    url: "/",
    siteName: "Resilience Test Series",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Resilience Test Series"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Resilience CA Final Test Series | Expert Evaluation & Mentorship",
    description:
      "Affordable CA Final test series with detailed evaluation, expert feedback, mentorship and personalized guidance.",
    images: ["/og-image.svg"]
  }
};

const benefits = [
  "Personal evaluation by 2 Chartered Accountants",
  "Personalized guidance with performance tracking",
  "Accountability system with timeline discipline",
  "Refundable deposit incentive for sincere attempts"
];

const heroProfiles = [
  {
    name: "CA Rishabh Daga",
    subtitle: "AIR 50 CA Inter",
    src: "/rishabh-daga.png",
    alt: "CA Rishabh Daga portrait",
    imageClassName: "object-cover object-[center_24%] scale-[1.18]"
  },
  {
    name: "CA Swarali Chandorkar",
    subtitle: "",
    src: "/swarali-chandorkar.jpeg",
    alt: "CA Swarali Chandorkar portrait",
    imageClassName: "object-cover object-center"
  }
] as const;

export default function HomePage() {
  const heroStats = landingStats.filter((item) => item.label !== "Evaluators");

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 grid-noise opacity-30" />
      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <section className="hero-glow glass-strong relative overflow-hidden rounded-[2rem] p-6 sm:p-10 lg:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.10),transparent_30%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <Badge>Disciplined CA Final Preparation</Badge>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.05em] leading-[1.05] text-ink-900 sm:text-6xl lg:text-7xl">
                CA Resilience Test Series
              </h1>
              <p className="mt-3 max-w-2xl text-xl font-medium tracking-[-0.03em] text-indigo-700 sm:text-2xl">
                Discipline = Success!
              </p>
              <p className="mt-5 max-w-2xl text-base leading-8 text-ink-600 sm:text-lg">
                Enroll in CA Final papers, choose your own timeline, submit sincerely, get evaluated by experts, and work toward a refundable deposit that rewards consistency.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryButton href="/register">Start Now</PrimaryButton>
                <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                  Student Login
                </Link>
                <Link href="/admin/login" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                  Admin Login
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {heroStats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-indigo-600">{item.label}</p>
                    <p className="mt-2 whitespace-pre-line text-lg font-semibold text-ink-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 max-w-md rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-indigo-600">Reach us at</p>
                <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-ink-900 sm:text-lg">caresilience@gmail.com</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-indigo-300/25 blur-3xl" />
              <div className="glass-strong relative rounded-[2rem] p-5 shadow-soft">
                <div className="rounded-[1.5rem] bg-ink-900 p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Pricing snapshot</p>
                  <div className="mt-4 space-y-3">
                    {pricingTable.map((plan) => (
                      <div key={plan.subjects} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold tracking-[-0.02em]">
                            {plan.subjects} {plan.subjects === 1 ? "Subject" : "Subjects"}
                          </p>
                          <p className="text-xs text-white/70">Course fee + refundable deposit</p>
                        </div>
                        <p className="text-sm font-semibold tracking-[-0.02em]">
                          {formatCurrency(plan.courseFee)} + {formatCurrency(plan.refundableDeposit)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-[1.5rem] border border-slate-200/70 bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {heroProfiles.map((profile) => (
                      <figure key={profile.name} className="flex flex-col items-center rounded-[1.5rem] border border-slate-200/70 bg-slate-50 p-4 text-center">
                          <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:h-40 sm:w-40">
                          <Image
                            src={profile.src}
                            alt={profile.alt}
                            fill
                            sizes="(max-width: 640px) 9rem, 10rem"
                            className={profile.imageClassName}
                            priority={profile.name === "CA Rishabh Daga"}
                          />
                        </div>
                        <figcaption className="mt-4 space-y-1">
                          <p className="text-sm font-semibold tracking-[-0.02em] text-ink-900">{profile.name}</p>
                          {profile.subtitle ? <p className="text-xs font-medium text-ink-600">{profile.subtitle}</p> : null}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="glass-strong rounded-[2rem] p-6 shadow-soft sm:p-8">
            <SectionHeading
              eyebrow="Why it works"
              title="A test series that rewards consistency."
              description="The platform combines accountability, guided practice, and a refundable deposit to keep CA Final preparation steady and serious."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {benefits.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-sm leading-6 text-ink-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-strong rounded-[2rem] p-6 shadow-soft sm:p-8">
            <SectionHeading
              eyebrow="How students enroll"
              title="From subject selection to UPI confirmation in a few clear steps."
            />
            <ol className="mt-6 space-y-4">
              {[
                "Enter your name, mobile number, and email ID.",
                "Choose one or more subjects and set your own timeline for each paper.",
                "Review the UPI details, submit your confirmation, and wait for admin approval.",
                "Track timelines, uploads, evaluations, and refund eligibility from your dashboard."
              ].map((step, index) => (
                <li key={step} className="flex gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-ink-700">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="mt-16">
          <SectionHeading
            eyebrow="Pricing"
            title="Clear pricing for full-package and subject-wise enrollment."
            description="The table below reflects the course fee plus the refundable deposit. You can later plug these slabs into the dynamic calculator in the registration flow."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {pricingTable.map((plan) => (
              <div key={plan.subjects} className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">{plan.subjects} subjects</p>
                <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-ink-900">{formatCurrency(plan.courseFee)}</p>
                <p className="mt-1 text-sm text-ink-600">Course fee</p>
                <div className="mt-5 rounded-2xl bg-indigo-50 p-4">
                  <p className="text-sm font-semibold text-indigo-700">Refundable deposit</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-indigo-800">{formatCurrency(plan.refundableDeposit)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading eyebrow="Testimonials" title="Social proof placeholders ready for launch." />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <figure key={item.name} className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-soft">
                <blockquote className="text-sm leading-7 text-ink-700">“{item.quote}”</blockquote>
                <figcaption className="mt-4">
                  <p className="font-semibold text-ink-900">{item.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">{item.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading eyebrow="FAQ" title="Common questions answered." />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faqs.map((faq) => (
              <details key={faq.q} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-900">{faq.q}</summary>
                <p className="mt-3 text-sm leading-7 text-ink-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
