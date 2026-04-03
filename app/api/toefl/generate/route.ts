import { NextResponse } from "next/server";
import { extractJson } from "@/lib/utils";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini";
import { redis } from "@/lib/redis";
import type { TOEFLGenerateResponse } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_CACHE_PREFIX = "brain-training:toefl:daily";
const DAILY_TTL_SECONDS = 60 * 60 * 24;
const DAILY_BATCH_SIZE = 20;

type TOEFLGenerateBatchResponse = {
  items: TOEFLGenerateResponse[];
};

function normalizeKeywords(items: string[] | undefined) {
  return Array.from(
    new Set(
      (items || [])
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function normalizeQuestion(
  parsed: Partial<TOEFLGenerateResponse>,
): TOEFLGenerateResponse | null {
  const focusKeywords = normalizeKeywords(parsed.focusKeywords).slice(0, 3);

  const candidateKeywords = normalizeKeywords([
    ...focusKeywords,
    ...(parsed.candidateKeywords || []),
  ]).slice(0, 8);

  const payload: TOEFLGenerateResponse = {
    topic: parsed.topic?.trim() || "",
    conversation: parsed.conversation?.trim() || "",
    candidateKeywords,
    focusKeywords,
  };

  if (
    !payload.topic ||
    !payload.conversation ||
    payload.candidateKeywords.length !== 8 ||
    payload.focusKeywords.length !== 3
  ) {
    return null;
  }

  return payload;
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getJakartaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function getDailyCacheKey() {
  return `${DAILY_CACHE_PREFIX}:${getJakartaDateKey()}`;
}

async function generateDailyBatch(): Promise<TOEFLGenerateResponse[]> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: getGeminiModel(),
    contents: `Generate ${DAILY_BATCH_SIZE} new conversations for a university student brain training game.`,
    config: {
      systemInstruction:
        `You create TOEFL Listening Part B style study material. Return valid JSON only.

The JSON must have exactly this shape:
{
  "items": [
    {
      "topic": "string",
      "conversation": "string",
      "candidateKeywords": ["string", "string", "string", "string", "string", "string", "string", "string"],
      "focusKeywords": ["string", "string", "string"]
    }
  ]
}

Rules:
- Create exactly ${DAILY_BATCH_SIZE} items.
- Create a natural English campus conversation around 180 to 230 words for each item.
- Format the conversation with one speaker turn per line.
- Every line must start with exactly 'Student A:' or 'Student B:'.
- Put a newline between turns.
- focusKeywords must contain exactly 3 best keywords for the main idea, lowercase, unique, and all three must be central.
- candidateKeywords must contain exactly 8 options, lowercase, unique.
- The same 3 focusKeywords must always be included inside candidateKeywords.
- Include 2 secondary details from the conversation.
- Include 3 distractor keywords that are mentioned but are not central to the main idea.
- Make the correct keywords clearly more central than the distractors.
- No markdown.
- No code fences.`,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            minItems: DAILY_BATCH_SIZE,
            maxItems: DAILY_BATCH_SIZE,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                topic: { type: "string" },
                conversation: { type: "string" },
                candidateKeywords: {
                  type: "array",
                  minItems: 8,
                  maxItems: 8,
                  items: { type: "string" },
                },
                focusKeywords: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "string" },
                },
              },
              required: [
                "topic",
                "conversation",
                "candidateKeywords",
                "focusKeywords",
              ],
            },
          },
        },
        required: ["items"],
      },
    },
  });

  const parsed = extractJson<TOEFLGenerateBatchResponse>(response.text ?? "");

  const normalizedItems = (parsed.items || [])
    .map((item) => normalizeQuestion(item))
    .filter((item): item is TOEFLGenerateResponse => item !== null);

  if (normalizedItems.length === 0) {
    throw new Error("Format respons batch AI tidak lengkap.");
  }

  return normalizedItems;
}

async function handleGenerate() {
  try {
    const cacheKey = getDailyCacheKey();

    if (redis) {
      const cachedItems = await redis.get<TOEFLGenerateResponse[]>(cacheKey);

      if (Array.isArray(cachedItems) && cachedItems.length > 0) {
        return NextResponse.json(pickRandom(cachedItems), {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      }
    }

    const freshItems = await generateDailyBatch();

    if (redis) {
      await redis.set(cacheKey, freshItems, {
        ex: DAILY_TTL_SECONDS,
      });
    }

    return NextResponse.json(pickRandom(freshItems), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat percakapan TOEFL.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleGenerate();
}

export async function POST() {
  return handleGenerate();
}