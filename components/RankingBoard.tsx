import { formatDateTime } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/game";

export function RankingBoard({
  entries,
  loading,
  error,
}: {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/30 backdrop-blur sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Ranking 1 Jam Terakhir
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Leaderboard</h2>
        </div>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
          TTL 60 menit
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
          Memuat ranking...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
          Belum ada skor aktif. Main dulu untuk masuk leaderboard.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sm font-bold text-sky-200">
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{entry.name}</p>
                    <p className="text-xs text-slate-400">
                      TOEFL {entry.breakdown.toefl} · Stroop {entry.breakdown.stroop} · Sequence {entry.breakdown.sequence}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-emerald-300">{entry.score}</p>
                <p className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
