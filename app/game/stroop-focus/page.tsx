"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameLayout } from "@/components/GameLayout";
import { STROOP_COLORS, STROOP_ROUNDS, STROOP_TIME_LIMIT_MS } from "@/lib/game-config";
import { getPlayerName, getSession, updateSession } from "@/lib/local-storage";
import { clamp, shuffleArray } from "@/lib/utils";

type StroopRound = {
  word: (typeof STROOP_COLORS)[number];
  ink: (typeof STROOP_COLORS)[number];
  options: Array<(typeof STROOP_COLORS)[number]>;
};

type StroopResult = {
  correct: boolean;
  reactionMs: number;
};

function createRounds() {
  return Array.from({ length: STROOP_ROUNDS }, () => {
    const word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    let ink = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];

    while (ink.value === word.value) {
      ink = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    }

    return {
      word,
      ink,
      options: shuffleArray([...STROOP_COLORS]),
    } satisfies StroopRound;
  });
}

function calculateScore(results: StroopResult[]) {
  const correctCount = results.filter((item) => item.correct).length;
  const accuracyRatio = results.length ? correctCount / results.length : 0;
  const correctTimes = results.filter((item) => item.correct).map((item) => item.reactionMs);
  const averageCorrectTime =
    correctTimes.length > 0
      ? correctTimes.reduce((total, value) => total + value, 0) / correctTimes.length
      : STROOP_TIME_LIMIT_MS;

  const speedRatio = clamp((STROOP_TIME_LIMIT_MS - averageCorrectTime) / 1200, 0, 1);
  const finalScore = Math.round(accuracyRatio * 75 + speedRatio * 25);

  return {
    finalScore,
    correctCount,
    averageCorrectTime: Math.round(averageCorrectTime),
  };
}

export default function StroopFocusPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [rounds, setRounds] = useState<StroopRound[]>([]);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [results, setResults] = useState<StroopResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [remainingMs, setRemainingMs] = useState(STROOP_TIME_LIMIT_MS);
  const lockRef = useRef(false);

  useEffect(() => {
    const name = getPlayerName();
    const session = getSession();

    if (!name || !session || typeof session.scores.toefl !== "number") {
      router.replace("/");
      return;
    }

    setPlayerName(name);
    setRounds(createRounds());
  }, [router]);

  const summary = useMemo(() => calculateScore(results), [results]);
  const currentRound = rounds[currentIndex];

  function moveToNextRound(nextResults: StroopResult[]) {
    if (currentIndex >= rounds.length - 1) {
      const scoreData = calculateScore(nextResults);
      updateSession({
        scores: {
          stroop: scoreData.finalScore,
        },
      });
      setFinished(true);
      return;
    }

    lockRef.current = false;
    setCurrentIndex((value) => value + 1);
    setStartedAt(performance.now());
    setRemainingMs(STROOP_TIME_LIMIT_MS);
  }

  function startGame() {
    const freshRounds = createRounds();
    lockRef.current = false;
    setRounds(freshRounds);
    setResults([]);
    setCurrentIndex(0);
    setFinished(false);
    setStarted(true);
    setStartedAt(performance.now());
    setRemainingMs(STROOP_TIME_LIMIT_MS);
  }

  function handleAnswer(colorValue: string) {
    if (!started || finished || !rounds[currentIndex] || lockRef.current) return;

    lockRef.current = true;
    const reactionMs = Math.min(Math.round(performance.now() - startedAt), STROOP_TIME_LIMIT_MS);
    const correct = colorValue === rounds[currentIndex].ink.value;
    const nextResults = [...results, { correct, reactionMs }];
    setResults(nextResults);
    moveToNextRound(nextResults);
  }

  useEffect(() => {
    if (!started || finished || !currentRound) return;

    lockRef.current = false;
    setRemainingMs(STROOP_TIME_LIMIT_MS);

    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setRemainingMs(Math.max(0, STROOP_TIME_LIMIT_MS - elapsed));
    }, 100);

    const timeoutId = window.setTimeout(() => {
      if (lockRef.current) return;
      lockRef.current = true;
      const nextResults = [...results, { correct: false, reactionMs: STROOP_TIME_LIMIT_MS }];
      setResults(nextResults);
      moveToNextRound(nextResults);
    }, STROOP_TIME_LIMIT_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timeoutId);
    };
  }, [started, finished, currentRound, startedAt, results]);

  return (
    <GameLayout
      step="Game 2 dari 3"
      title="Stroop Focus"
      description="Fokus pada warna tinta, bukan kata yang tertulis. Versi ini lebih menantang: warna lebih banyak, posisi jawaban selalu berubah, dan tiap ronde ada batas waktu."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Pemain: <strong className="text-white">{playerName || "-"}</strong>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Ronde: {Math.min(currentIndex + 1, STROOP_ROUNDS)}/{STROOP_ROUNDS}
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
            Batas waktu: {(STROOP_TIME_LIMIT_MS / 1000).toFixed(1)} detik
          </span>
        </div>

        {!started ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Contoh: jika yang muncul adalah kata <strong>MERAH</strong> tetapi warnanya biru, jawaban yang benar adalah <strong>BIRU</strong>. Hati-hati, posisi pilihan akan terus berubah dan kamu harus menjawab sebelum waktu habis.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-5 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Mulai Stroop Focus
            </button>
          </div>
        ) : finished ? (
          <div className="space-y-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Skor</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.finalScore}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Benar</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.correctCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Rata-rata</p>
                <p className="mt-2 text-3xl font-bold text-white">{summary.averageCorrectTime}ms</p>
              </div>
            </div>

            <p className="text-sm leading-7 text-slate-200">
              Versi ini lebih menekankan akurasi di bawah tekanan waktu. Kalau banyak timeout atau salah klik, skor akan turun cukup besar.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/game/sequence")}
                className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Lanjut ke Sequence
              </button>
              <button
                type="button"
                onClick={startGame}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-400/10"
              >
                Ulangi Stroop
              </button>
            </div>
          </div>
        ) : currentRound ? (
          <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
              <span>Pilih warna tinta yang benar</span>
              <span className="text-rose-200">Sisa: {(remainingMs / 1000).toFixed(1)}s</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-rose-400 transition-[width] duration-100"
                style={{ width: `${(remainingMs / STROOP_TIME_LIMIT_MS) * 100}%` }}
              />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 px-4 py-10 sm:px-8 sm:py-14">
              <p
                className="text-5xl font-black tracking-wide sm:text-7xl"
                style={{ color: currentRound.ink.hex }}
              >
                {currentRound.word.label}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {currentRound.options.map((option) => (
                <button
                  key={`${currentIndex}-${option.value}`}
                  type="button"
                  onClick={() => handleAnswer(option.value)}
                  className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm font-bold text-white transition hover:scale-[1.01] hover:border-sky-400/30"
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: option.hex }}
                  />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </GameLayout>
  );
}
