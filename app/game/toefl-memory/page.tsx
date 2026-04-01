"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameLayout } from "@/components/GameLayout";
import { getPlayerName, getSession, updateSession } from "@/lib/local-storage";
import type { TOEFLGenerateResponse, TOEFLEvaluationResponse } from "@/types/game";

export default function TOEFLMemoryPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [gameData, setGameData] = useState<TOEFLGenerateResponse | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<TOEFLEvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const hasInitialized = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const name = getPlayerName();
    if (!name) {
      router.replace("/");
      return;
    }

    setPlayerName(name);

    const session = getSession();
    if (!session?.name) {
      router.replace("/");
    }
  }, [router]);

  const correctKeywords = useMemo(
    () => evaluation?.perKeyword.filter((item) => item.verdict === "relevant") || [],
    [evaluation],
  );

  const wrongKeywords = useMemo(
    () => evaluation?.perKeyword.filter((item) => item.verdict !== "relevant") || [],
    [evaluation],
  );

  async function generateConversation() {
    setLoading(true);
    setLoadError("");
    setActionError("");
    setEvaluation(null);
    setSelectedKeywords([]);

    try {
      const response = await fetch("/api/toefl/generate", {
        method: "POST",
      });
      const data = (await response.json()) as TOEFLGenerateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat soal TOEFL.");
      }

      setGameData(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Terjadi error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartGame() {
    setHasStarted(true);
    await generateConversation();
  }

  function toggleKeyword(keyword: string) {
    setEvaluation(null);
    setSelectedKeywords((current) => {
      if (current.includes(keyword)) {
        return current.filter((item) => item !== keyword);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, keyword];
    });
  }

  async function handleEvaluate() {
    if (!gameData || selectedKeywords.length !== 3) return;

    setEvaluating(true);
    setActionError("");

    try {
      const response = await fetch("/api/toefl/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: gameData.conversation,
          chosenKeywords: selectedKeywords,
          focusKeywords: gameData.focusKeywords,
        }),
      });

      const data = (await response.json()) as TOEFLEvaluationResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengevaluasi jawaban.");
      }

      setEvaluation(data);
      updateSession({
        scores: {
          toefl: data.score,
        },
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Terjadi error.");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <GameLayout
      step="Game 1 dari 3"
      title="TOEFL Memory"
      description="Baca percakapan bergaya TOEFL Listening Part B, pilih 3 keyword inti, lalu lihat evaluasi AI yang tegas: mana yang benar, mana yang salah, dan keyword inti apa yang seharusnya dipilih."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Pemain: <strong className="text-white">{playerName || "-"}</strong>
          </span>
          {hasStarted ? (
            <button
              type="button"
              onClick={() => void generateConversation()}
              className="rounded-full border border-white/10 px-3 py-1 transition hover:border-sky-400/50 hover:bg-sky-400/10"
            >
              Soal baru
            </button>
          ) : null}
        </div>

        {!hasStarted ? (
          <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Sebelum mulai
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Cara bermain TOEFL Memory</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Anda akan membaca satu percakapan kampus berbahasa Inggris seperti TOEFL Listening Part B.
                Tugas Anda adalah memilih <strong className="text-white">3 keyword paling inti</strong>,
                bukan sekadar kata yang muncul di dalam teks.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-white">Yang harus dicari</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <li>• topik utama yang sedang dibahas</li>
                  <li>• masalah utama atau perubahan penting</li>
                  <li>• keputusan, solusi, atau hasil akhir percakapan</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-white">Yang sebaiknya dihindari</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <li>• detail kecil yang hanya disebut sekali</li>
                  <li>• tempat, waktu, atau benda yang tidak mengubah inti dialog</li>
                  <li>• kata yang menarik tetapi hanya berfungsi sebagai pelengkap</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-sm font-semibold text-emerald-100">Skor TOEFL Memory</p>
              <div className="mt-3 grid gap-3 text-sm text-emerald-50 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">3 benar = 100</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">2 benar = 70</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">1 benar = 35</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">0 benar = 0</div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-50">
              Setelah Anda memilih 3 keyword, AI akan menjelaskan <strong className="text-white">mana yang benar</strong>,
              menunjukkan <strong className="text-white">mana yang salah</strong>, dan memberi tahu
              <strong className="text-white"> keyword inti yang seharusnya masuk</strong>.
            </div>

            <button
              type="button"
              onClick={() => void handleStartGame()}
              disabled={loading}
              className="w-full rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading ? "AI sedang menyiapkan soal..." : "Mulai TOEFL Memory"}
            </button>
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-10 text-center text-slate-300">
            AI sedang membuat percakapan TOEFL...
          </div>
        ) : loadError ? (
          <div className="space-y-4 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-100">
            <p>{loadError}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void generateConversation()}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Coba lagi
              </button>
              <button
                type="button"
                onClick={() => setHasStarted(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Kembali ke penjelasan
              </button>
            </div>
          </div>
        ) : gameData ? (
          <>
            <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm leading-7 text-sky-50">
              Fokus pada <strong className="text-white">inti percakapan</strong>: topik utama, masalah penting,
              dan keputusan akhir. Jangan pilih keyword hanya karena kata itu muncul di teks.
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Topik
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">{gameData.topic}</h2>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-7 whitespace-pre-line text-slate-200 sm:text-base">
                {gameData.conversation.replace(/\s*(Student A:|Student B:)\s*/g, "\n\n$1 ")}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
                    Pilih Kata Kunci
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Pilih tepat 3 keyword yang paling mewakili inti percakapan.
                  </p>
                </div>
                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-100">
                  {selectedKeywords.length}/3 dipilih
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {gameData.candidateKeywords.map((keyword) => {
                  const active = selectedKeywords.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => toggleKeyword(keyword)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "border-sky-400 bg-sky-400/20 text-sky-100"
                          : "border-white/10 bg-slate-950/60 text-slate-200 hover:border-sky-400/40 hover:bg-sky-400/10"
                      }`}
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>

              {actionError ? (
                <p className="mt-4 text-sm text-rose-300">{actionError}</p>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={selectedKeywords.length !== 3 || evaluating}
                  onClick={() => void handleEvaluate()}
                  className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {evaluating ? "AI sedang menilai..." : "Evaluasi Jawaban"}
                </button>

                {evaluation ? (
                  <button
                    type="button"
                    onClick={() => router.push("/game/stroop-focus")}
                    className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                  >
                    Lanjut ke Stroop Focus
                  </button>
                ) : null}
              </div>
            </div>

            {evaluation ? (
              <div className="space-y-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                      Hasil Evaluasi AI
                    </p>
                    <p className="mt-1 text-sm leading-7 text-emerald-50">{evaluation.feedback}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/50 px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Skor</p>
                    <p className="text-3xl font-bold text-white">{evaluation.score}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/45 p-4">
                    <p className="text-sm font-semibold text-emerald-100">Keyword yang sudah benar</p>
                    {correctKeywords.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {correctKeywords.map((item) => (
                          <div key={item.keyword} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-white">{item.keyword}</p>
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                                benar
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-300">Belum ada keyword yang tepat pada percobaan ini.</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-rose-400/20 bg-slate-950/45 p-4">
                    <p className="text-sm font-semibold text-rose-100">Keyword yang perlu diperbaiki</p>
                    {wrongKeywords.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {wrongKeywords.map((item) => (
                          <div key={item.keyword} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-white">{item.keyword}</p>
                              <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-100">
                                salah
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.reason}</p>
                            {item.suggestedKeyword ? (
                              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                                  keyword yang seharusnya masuk
                                </p>
                                <p className="mt-1 font-semibold text-white">{item.suggestedKeyword}</p>
                                {item.suggestedReason ? (
                                  <p className="mt-2 text-sm leading-6 text-amber-50">{item.suggestedReason}</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-300">Tidak ada keyword yang salah. Semua pilihan Anda sudah tepat.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-50">Keyword inti yang seharusnya masuk</p>
                  {evaluation.missedKeywords.length > 0 ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {evaluation.missedKeywords.map((item) => (
                        <div key={item.keyword} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                          <p className="font-semibold text-white">{item.keyword}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-50">Tidak ada keyword inti yang terlewat. Ketiga pilihan Anda sudah masuk semua.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                  <span className="font-semibold text-white">Jawaban keyword inti:</span>{" "}
                  {evaluation.idealKeywords.join(", ")}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </GameLayout>
  );
}
