import Link from "next/link";
import type { ReactNode } from "react";

type SiteShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function SiteShell({ title, subtitle, children, actions }: SiteShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900 text-sm font-semibold text-white shadow-soft">
              R
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-ink-500">Resilience</p>
              <p className="font-semibold text-ink-900">Test Series</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">{actions}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-soft backdrop-blur-xl sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700">CA Final Online Test Series</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-ink-900 sm:text-5xl" style={{ fontFamily: "var(--font-cormorant)" }}>
            {title}
          </h1>
          {subtitle ? <p className="mt-4 max-w-3xl text-base leading-7 text-ink-600 sm:text-lg">{subtitle}</p> : null}
        </section>
        {children}
      </main>
    </div>
  );
}
