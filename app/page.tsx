"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RankingBoard } from "@/components/RankingBoard";
import { getPlayerName, savePlayerName, startFreshSession } from "@/lib/local-storage";
import type { LeaderboardEntry } from "@/types/game";

const GAME_LIST = [
  {
    title: "TOEFL Memory",
    description:
      "Baca percakapan gaya TOEFL Part B, lalu pilih 3 kata kunci paling penting dan dapatkan evaluasi dari AI.",
  },
  {
    title: "Stroop Focus",
    description:
      "Tebak warna tulisan secepat mungkin, bukan membaca katanya. Fokus dan kecepatan diuji bersamaan.",
  },
  {
    title: "Sequence",
    description:
      "Ingat urutan 5 kata kerja akademik yang tampil bergantian, lalu susun ulang secara tepat.",
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rankingError, setRankingError] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setName(getPlayerName());
    void fetchRanking();
  }, []);

  async function fetchRanking() {
    setLoading(true);
    setRankingError("");

    try {
      const response = await fetch("/api/ranking", { cache: "no-store" });
      const data = (await response.json()) as { entries?: LeaderboardEntry[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil ranking.");
      }

      setEntries(data.entries ?? []);
    } catch (err) {
      setRankingError(err instanceof Error ? err.message : "Terjadi error.");
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Nama wajib diisi dulu.");
      return;
    }

    setError("");
    savePlayerName(cleanName);
    startFreshSession(cleanName);
    router.push("/game/toefl-memory");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-8">
            <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
              Brain Training TOEFL
            </div>

            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-5xl">
              Latihan fokus, memori, dan pemahaman teks (keyword) untuk tugas TOEFL Listening Part B.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Versi ini memakai teks, bukan audio. Nama disimpan di localStorage tanpa login, lalu skor akhir dikirim ke leaderboard dengan masa aktif 1 jam.
            </p>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <label htmlFor="player-name" className="mb-2 block text-sm font-medium text-slate-200">
                Nama pemain
              </label>
              <input
                id="player-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Mukit Forever"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
              />

              {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleStart}
                  className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  Mulai Game
                </button>
                <p className="text-xs leading-6 text-slate-400 sm:text-sm">
                  Nama terakhir akan otomatis terisi kembali saat Anda membuka halaman ini.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-xl shadow-slate-950/30 backdrop-blur sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
              Isi Permainan
            </p>
            <div className="mt-4 space-y-4">
              {GAME_LIST.map((game, index) => (
                <div key={game.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-400/15 text-sm font-bold text-fuchsia-200">
                      {index + 1}
                    </div>
                    <h2 className="font-semibold text-white">{game.title}</h2>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">{game.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <RankingBoard entries={entries} loading={loading} error={rankingError} />
      </div>
    </main>
  );
}
