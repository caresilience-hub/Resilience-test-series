import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">{eyebrow}</p> : null}
      <h2 className="mt-3 font-serif text-3xl text-ink-900 sm:text-4xl" style={{ fontFamily: "var(--font-cormorant)" }}>
        {title}
      </h2>
      {description ? <p className="mt-3 text-sm leading-7 text-ink-600 sm:text-base">{description}</p> : null}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{children}</span>;
}

export function PrimaryButton({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ink-800"
    >
      {children}
    </a>
  );
}
