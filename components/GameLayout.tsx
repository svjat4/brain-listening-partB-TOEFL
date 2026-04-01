import Link from "next/link";
import type { ReactNode } from "react";

export function GameLayout({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
              {step}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {title}
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-400/10"
          >
            Beranda
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-6">
          <p className="mb-5 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {description}
          </p>
          {children}
        </section>
      </div>
    </main>
  );
}
