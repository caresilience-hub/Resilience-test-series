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
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-8xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,70,229,0.25)]">
              R
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">Resilience</p>
              <p className="font-semibold text-ink-900">Test Series</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">{actions}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-[2rem] border border-slate-200/70 bg-white/75 p-6 shadow-soft backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">CA Final Online Test Series</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink-900 sm:text-5xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-4 max-w-3xl text-base leading-7 text-ink-600 sm:text-lg">{subtitle}</p> : null}
        </section>
        {children}
      </main>
    </div>
  );
}
