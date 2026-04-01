import { redis } from "@/lib/redis";
import type { LeaderboardEntry, ScoreBreakdown } from "@/types/game";

const LEADERBOARD_ZSET = "brain-training:leaderboard";
const ENTRY_PREFIX = "brain-training:entry:";
const ENTRY_TTL_SECONDS = 60 * 60;

function getEntryKey(id: string) {
  return `${ENTRY_PREFIX}${id}`;
}

export async function saveLeaderboardEntry(input: {
  name: string;
  score: number;
  breakdown: ScoreBreakdown;
}) {
  if (!redis) {
    return { id: null as string | null, saved: false };
  }

  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const entry: LeaderboardEntry = {
    id,
    name: input.name.trim().slice(0, 40),
    score: input.score,
    breakdown: input.breakdown,
    createdAt: Date.now(),
  };

  await redis.set(getEntryKey(id), entry, { ex: ENTRY_TTL_SECONDS });
  await redis.zadd(LEADERBOARD_ZSET, { score: input.score, member: id });

  return { id, saved: true };
}

export async function getLeaderboard(limit = 10) {
  if (!redis) {
    return [] as LeaderboardEntry[];
  }

  const ids = await redis.zrange(LEADERBOARD_ZSET, 0, limit - 1, {
    rev: true,
  });

  const normalizedIds = Array.isArray(ids) ? ids.map((id) => String(id)) : [];

  if (!normalizedIds.length) {
    return [] as LeaderboardEntry[];
  }

  const entries = await Promise.all(
    normalizedIds.map(async (id) => {
      const entry = await redis.get<LeaderboardEntry>(getEntryKey(id));
      return { id, entry };
    }),
  );

  const validEntries: LeaderboardEntry[] = [];
  const staleIds: string[] = [];

  for (const item of entries) {
    if (item.entry) {
      validEntries.push(item.entry);
    } else {
      staleIds.push(item.id);
    }
  }

  if (staleIds.length > 0) {
    await Promise.all(staleIds.map((id) => redis.zrem(LEADERBOARD_ZSET, id)));
  }

  return validEntries;
}
