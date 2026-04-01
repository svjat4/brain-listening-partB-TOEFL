"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameLayout } from "@/components/GameLayout";
import { ACADEMIC_VERBS, SEQUENCE_SHOW_MS, SEQUENCE_WORD_COUNT } from "@/lib/game-config";
import { getPlayerName, getSession, updateSession } from "@/lib/local-storage";
import { shuffleArray } from "@/lib/utils";

function createSequence() {
  return shuffleArray([...ACADEMIC_VERBS]).slice(0, SEQUENCE_WORD_COUNT);
}

export default function SequencePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [phase, setPhase] = useState<"ready" | "showing" | "answering" | "saving">("ready");
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [answer, setAnswer] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const name = getPlayerName();
    const session = getSession();

    if (!name || !session || typeof session.scores.stroop !== "number") {
      router.replace("/");
      return;
    }

    setPlayerName(name);
    setSequence(createSequence());
  }, [router]);

  useEffect(() => {
    if (phase !== "showing" || sequence.length === 0) return;

    let index = 0;
    setCurrentShowIndex(1);
    setCurrentWord(sequence[0]);

    const timer = window.setInterval(() => {
      index += 1;

      if (index < sequence.length) {
        setCurrentWord(sequence[index]);
        setCurrentShowIndex(index + 1);
      } else {
        window.clearInterval(timer);
        setCurrentWord("");
        setCurrentShowIndex(0);
        setPhase("answering");
      }
    }, SEQUENCE_SHOW_MS);

    return () => window.clearInterval(timer);
  }, [phase, sequence]);

  const shuffledOptions = useMemo(() => shuffleArray(sequence), [sequence]);

  function startSequence() {
    const freshSequence = createSequence();
    setSequence(freshSequence);
    setAnswer([]);
    setCurrentWord("");
    setCurrentShowIndex(0);
    setSaveError("");
    setPhase("showing");
  }

  function addWord(word: string) {
    if (answer.includes(word) || answer.length >= sequence.length) return;
    setAnswer((current) => [...current, word]);
  }

  function removeLastWord() {
    setAnswer((current) => current.slice(0, -1));
  }

  function resetAnswer() {
    setAnswer([]);
  }

  async function finishGame() {
    if (answer.length !== sequence.length) return;

    setPhase("saving");
    setSaveError("");

    const correctCount = sequence.filter((word, index) => answer[index] === word).length;
    const sequenceScore = correctCount * 20;

    const session = getSession();
    const breakdown = {
      toefl: Number(session?.scores.toefl ?? 0),
      stroop: Number(session?.scores.stroop ?? 0),
      sequence: sequenceScore,
      total: Number(session?.scores.toefl ?? 0) + Number(session?.scores.stroop ?? 0) + sequenceScore,
    };

    updateSession({
      scores: breakdown,
      submittedEntryId: undefined,
    });

    try {
      const response = await fetch("/api/ranking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: playerName,
          breakdown,
        }),
      });

      const data = (await response.json()) as { entryId?: string; saved?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan ranking.");
      }

      updateSession({
        scores: breakdown,
        submittedEntryId: data.entryId,
      });
      router.push("/game/result");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Ranking gagal disimpan.");
      router.push("/game/result");
    }
  }

  return (
    <GameLayout
      step="Game 3 dari 3"
      title="Sequence"
      description="Ingat 5 kata kerja akademik yang muncul satu per satu. Setiap permainan akan memilih kata yang berbeda secara acak dari bank kata yang lebih besar."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Pemain: <strong className="text-white">{playerName || "-"}</strong>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Target: {SEQUENCE_WORD_COUNT} kata
          </span>
        </div>

        {phase === "ready" ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Kata akan tampil bergantian secara otomatis. Setiap permainan, urutan dan pilihan katanya berubah karena diambil acak dari bank kata akademik. Setelah selesai, susun ulang urutannya dengan menekan tombol kata.
            </p>
            <button
              type="button"
              onClick={startSequence}
              className="mt-5 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Mulai Sequence
            </button>
          </div>
        ) : null}

        {phase === "showing" ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
              <span>Hafalkan urutannya</span>
              <span>
                {currentShowIndex}/{sequence.length}
              </span>
            </div>
            <div className="mt-4 rounded-[2rem] border border-white/10 bg-slate-950/70 px-4 py-16">
              <p className="text-4xl font-black tracking-wide text-white sm:text-6xl">{currentWord}</p>
            </div>
          </div>
        ) : null}

        {phase === "answering" ? (
          <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
                Susun Jawaban
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Ketuk kata untuk mengisi slot jawaban dari posisi 1 sampai {SEQUENCE_WORD_COUNT}.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: SEQUENCE_WORD_COUNT }, (_, index) => (
                <div
                  key={`slot-${index + 1}`}
                  className="flex min-h-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 px-2 text-center text-sm font-semibold text-white"
                >
                  {answer[index] ? (
                    answer[index]
                  ) : (
                    <span className="text-slate-500">{index + 1}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {shuffledOptions.map((word) => {
                const used = answer.includes(word);
                return (
                  <button
                    key={word}
                    type="button"
                    disabled={used}
                    onClick={() => addWord(word)}
                    className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition enabled:hover:border-sky-400/40 enabled:hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={removeLastWord}
                className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-400/10"
              >
                Hapus terakhir
              </button>
              <button
                type="button"
                onClick={resetAnswer}
                className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-400/10"
              >
                Reset jawaban
              </button>
              <button
                type="button"
                disabled={answer.length !== sequence.length}
                onClick={() => void finishGame()}
                className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Selesaikan & Simpan Skor
              </button>
            </div>
          </div>
        ) : null}

        {phase === "saving" ? (
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-50">
            Menyimpan skor akhir dan menyiapkan halaman hasil...
            {saveError ? <p className="mt-2 text-rose-200">{saveError}</p> : null}
          </div>
        ) : null}
      </div>
    </GameLayout>
  );
}
