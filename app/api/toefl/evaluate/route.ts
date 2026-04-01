import { NextResponse } from "next/server";
import { extractJson } from "@/lib/utils";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini";
import type { KeywordVerdict, TOEFLEvaluationResponse } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeminiKeywordExplanation = {
  keyword: string;
  reason: string;
};

type GeminiWrongKeywordExplanation = {
  keyword: string;
  reason: string;
  shouldChoose: string;
  shouldChooseReason: string;
};

type GeminiEvaluationExplanation = {
  feedback: string;
  correctChosen: GeminiKeywordExplanation[];
  incorrectChosen: GeminiWrongKeywordExplanation[];
  missedKeywords: GeminiKeywordExplanation[];
};

function normalizeKeywords(items: string[] | undefined) {
  return Array.from(
    new Set((items || []).map((item) => item.trim().toLowerCase()).filter(Boolean)),
  );
}

function getScoreFromCorrectCount(correctCount: number) {
  const scoreMap = [0, 35, 70, 100];
  return scoreMap[correctCount] ?? 0;
}

function getFallbackSummary(correctCount: number) {
  if (correctCount === 3) {
    return "Semua keyword yang Anda pilih sudah tepat. Ketiganya benar-benar menangkap inti percakapan, jadi strategi membaca ide utama Anda sudah sangat baik.";
  }

  if (correctCount === 2) {
    return "Dua keyword Anda sudah tepat, tetapi masih ada satu pilihan yang belum mengenai inti percakapan. Perhatikan lagi kata yang paling mewakili masalah utama atau keputusan penting dalam dialog.";
  }

  if (correctCount === 1) {
    return "Baru satu keyword yang benar-benar inti. Dua pilihan lain masih terlalu jauh dari gagasan utama, jadi Anda perlu lebih fokus pada pokok masalah dan hasil akhirnya.";
  }

  return "Belum ada keyword inti yang terpilih dengan tepat. Coba cari topik utama, masalah yang dibahas, dan keputusan atau solusi yang muncul di akhir percakapan.";
}

function getFallbackCorrectReason(keyword: string) {
  return `Keyword "${keyword}" sudah tepat karena termasuk inti informasi yang paling menentukan isi percakapan.`;
}

function getFallbackWrongReason(keyword: string, suggestedKeyword?: string) {
  if (suggestedKeyword) {
    return `Keyword "${keyword}" kurang tepat karena bukan inti utama percakapan. Posisi ini seharusnya diisi oleh "${suggestedKeyword}" yang lebih mewakili gagasan utama.`;
  }

  return `Keyword "${keyword}" kurang tepat karena tidak mewakili inti utama percakapan.`;
}

function getFallbackSuggestedReason(keyword: string) {
  return `Keyword "${keyword}" lebih tepat karena mewakili ide pokok yang benar-benar dibahas dalam percakapan.`;
}

function toReasonMap(items: GeminiKeywordExplanation[] | undefined) {
  const map = new Map<string, string>();

  for (const item of items || []) {
    const keyword = item.keyword?.trim().toLowerCase();
    const reason = item.reason?.trim();

    if (keyword && reason) {
      map.set(keyword, reason);
    }
  }

  return map;
}

function toWrongMap(items: GeminiWrongKeywordExplanation[] | undefined) {
  const map = new Map<string, GeminiWrongKeywordExplanation>();

  for (const item of items || []) {
    const keyword = item.keyword?.trim().toLowerCase();

    if (keyword) {
      map.set(keyword, {
        keyword,
        reason: item.reason?.trim() || "",
        shouldChoose: item.shouldChoose?.trim().toLowerCase() || "",
        shouldChooseReason: item.shouldChooseReason?.trim() || "",
      });
    }
  }

  return map;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversation?: string;
      chosenKeywords?: string[];
      focusKeywords?: string[];
    };

    const conversation = body.conversation?.trim();
    const chosenKeywords = normalizeKeywords(body.chosenKeywords).slice(0, 3);
    const focusKeywords = normalizeKeywords(body.focusKeywords).slice(0, 3);

    if (!conversation) {
      return NextResponse.json({ error: "Percakapan tidak ditemukan." }, { status: 400 });
    }

    if (chosenKeywords.length !== 3) {
      return NextResponse.json(
        { error: "Pilih tepat 3 kata kunci yang berbeda." },
        { status: 400 },
      );
    }

    if (focusKeywords.length !== 3) {
      return NextResponse.json(
        { error: "Kata kunci referensi tidak lengkap." },
        { status: 400 },
      );
    }

    const focusSet = new Set(focusKeywords);
    const chosenSet = new Set(chosenKeywords);

    const correctChosenKeywords = chosenKeywords.filter((keyword) => focusSet.has(keyword));
    const incorrectChosenKeywords = chosenKeywords.filter((keyword) => !focusSet.has(keyword));
    const missedCoreKeywords = focusKeywords.filter((keyword) => !chosenSet.has(keyword));

    const score = getScoreFromCorrectCount(correctChosenKeywords.length);
    const wrongKeywordPairs = incorrectChosenKeywords.map((keyword, index) => ({
      keyword,
      shouldChoose: missedCoreKeywords[index] || "",
    }));

    let feedback = getFallbackSummary(correctChosenKeywords.length);
    let correctReasonMap = new Map<string, string>();
    let wrongReasonMap = new Map<string, GeminiWrongKeywordExplanation>();
    let missedReasonMap = new Map<string, string>();

    try {
      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: getGeminiModel(),
        contents: JSON.stringify(
          {
            conversation,
            focusKeywords,
            chosenKeywords,
            correctChosenKeywords,
            wrongKeywordPairs,
            missedCoreKeywords,
            finalScore: score,
          },
          null,
          2,
        ),
        config: {
          systemInstruction:
            "You explain TOEFL keyword choices for Indonesian students. Be strict and accurate. A chosen keyword is correct only if it appears in correctChosenKeywords. A chosen keyword is wrong only if it appears in wrongKeywordPairs. Never praise a wrong keyword. For each wrong keyword, explain why it is not central to the conversation and point to the exact replacement keyword from shouldChoose. For each missed keyword, explain why it is central to the main idea. Return valid JSON only with exactly these keys: feedback, correctChosen, incorrectChosen, missedKeywords. feedback must be in Indonesian, 2 or 3 short sentences, and must match the provided finalScore. Keep keyword strings exactly as given and keep array order the same as the input data. Do not add markdown.",
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              feedback: { type: "string" },
              correctChosen: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    keyword: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["keyword", "reason"],
                },
              },
              incorrectChosen: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    keyword: { type: "string" },
                    reason: { type: "string" },
                    shouldChoose: { type: "string" },
                    shouldChooseReason: { type: "string" },
                  },
                  required: ["keyword", "reason", "shouldChoose", "shouldChooseReason"],
                },
              },
              missedKeywords: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    keyword: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["keyword", "reason"],
                },
              },
            },
            required: ["feedback", "correctChosen", "incorrectChosen", "missedKeywords"],
          },
        },
      });

      const parsed = extractJson<GeminiEvaluationExplanation>(response.text ?? "");

      if (parsed.feedback?.trim()) {
        feedback = parsed.feedback.trim();
      }

      correctReasonMap = toReasonMap(parsed.correctChosen);
      wrongReasonMap = toWrongMap(parsed.incorrectChosen);
      missedReasonMap = toReasonMap(parsed.missedKeywords);
    } catch {
      // Gunakan fallback deterministik jika Gemini gagal atau respons tidak valid.
    }

    const perKeyword: TOEFLEvaluationResponse["perKeyword"] = chosenKeywords.map((keyword) => {
      const verdict: KeywordVerdict = focusSet.has(keyword) ? "relevant" : "not relevant";

      if (verdict === "relevant") {
        return {
          keyword,
          verdict,
          reason: correctReasonMap.get(keyword) || getFallbackCorrectReason(keyword),
        };
      }

      const pair = wrongKeywordPairs.find((item) => item.keyword === keyword);
      const aiWrong = wrongReasonMap.get(keyword);
      const suggestedKeyword = pair?.shouldChoose || aiWrong?.shouldChoose || "";

      return {
        keyword,
        verdict,
        reason:
          aiWrong?.reason || getFallbackWrongReason(keyword, suggestedKeyword || undefined),
        suggestedKeyword: suggestedKeyword || undefined,
        suggestedReason:
          aiWrong?.shouldChooseReason ||
          (suggestedKeyword ? getFallbackSuggestedReason(suggestedKeyword) : undefined),
      };
    });

    const missedKeywords = missedCoreKeywords.map((keyword) => ({
      keyword,
      reason: missedReasonMap.get(keyword) || getFallbackSuggestedReason(keyword),
    }));

    const payload: TOEFLEvaluationResponse = {
      score,
      chosenKeywords,
      idealKeywords: focusKeywords,
      feedback,
      perKeyword,
      missedKeywords,
    };

    return NextResponse.json(payload, {
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
            : "Gagal mengevaluasi kata kunci.",
      },
      { status: 500 },
    );
  }
}
