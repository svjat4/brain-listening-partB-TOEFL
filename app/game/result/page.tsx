"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameLayout } from "@/components/GameLayout";
import { getSession } from "@/lib/local-storage";

export default function ResultPage() {
  const router = useRouter();

  const [secondsLeft, setSecondsLeft] = useState(6);
  const [name, setName] = useState("");
  const [scores, setScores] = useState({
    toefl: 0,
    stroop: 0,
    sequence: 0,
    total: 0,
  });
  const [savedToRanking, setSavedToRanking] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session || typeof session.scores?.total !== "number") {
      router.replace("/");
      return;
    }

    setName(session.name ?? "");
    setScores({
      toefl: Number(session.scores?.toefl ?? 0),
      stroop: Number(session.scores?.stroop ?? 0),
      sequence: Number(session.scores?.sequence ?? 0),
      total: Number(session.scores?.total ?? 0),
    });
    setSavedToRanking(Boolean(session.submittedEntryId));
    setSessionReady(true);
  }, [router]);

  useEffect(() => {
    if (!sessionReady) return;

    if (secondsLeft <= 0) {
      router.replace("/");
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [sessionReady, secondsLeft, router]);

  return (
    <GameLayout
      step="Selesai"
      title="Hasil Akhir"
      description="Skor Anda sudah dihitung. Halaman akan kembali ke beranda secara otomatis agar leaderboard bisa langsung terlihat."
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-300">
            Selamat, <strong className="text-white">{name || "Pemain"}</strong>!
          </p>
          <p className="mt-2 text-4xl font-black text-white sm:text-5xl">
            {scores.total}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {savedToRanking
              ? "Skor sudah dikirim ke leaderboard aktif 1 jam."
              : "Skor lokal sudah tersimpan, tetapi ranking belum masuk karena storage belum aktif atau terjadi error saat menyimpan."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
              TOEFL Memory
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{scores.toefl}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-fuchsia-300">
              Stroop Focus
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{scores.stroop}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
              Sequence
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              {scores.sequence}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-300">
            Kembali ke beranda dalam {secondsLeft} detik.
          </p>

          <button
            type="button"
            onClick={() => router.replace("/")}
            className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Kembali sekarang
          </button>
        </div>
      </div>
    </GameLayout>
  );
}