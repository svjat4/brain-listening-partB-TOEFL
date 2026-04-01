import { NextResponse } from "next/server";
import { getLeaderboard, saveLeaderboardEntry } from "@/lib/leaderboard";
import type { ScoreBreakdown } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getLeaderboard(10);

  return NextResponse.json(
    { entries },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      breakdown?: Partial<ScoreBreakdown>;
    };

    const name = body.name?.trim() ?? "";
    const breakdown = body.breakdown;

    if (!name) {
      return NextResponse.json({ error: "Nama pemain wajib diisi." }, { status: 400 });
    }

    if (!breakdown) {
      return NextResponse.json({ error: "Skor belum lengkap." }, { status: 400 });
    }

    const normalizedBreakdown: ScoreBreakdown = {
      toefl: Math.max(0, Math.min(100, Math.round(Number(breakdown.toefl ?? 0)))),
      stroop: Math.max(0, Math.min(100, Math.round(Number(breakdown.stroop ?? 0)))),
      sequence: Math.max(0, Math.min(100, Math.round(Number(breakdown.sequence ?? 0)))),
      total: 0,
    };

    normalizedBreakdown.total =
      normalizedBreakdown.toefl + normalizedBreakdown.stroop + normalizedBreakdown.sequence;

    const result = await saveLeaderboardEntry({
      name,
      score: normalizedBreakdown.total,
      breakdown: normalizedBreakdown,
    });

    return NextResponse.json({
      saved: result.saved,
      entryId: result.id,
      total: normalizedBreakdown.total,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal menyimpan ranking.",
      },
      { status: 500 },
    );
  }
}
