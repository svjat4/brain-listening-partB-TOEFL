import { NextResponse } from "next/server";
import { extractJson } from "@/lib/utils";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini";
import type { TOEFLGenerateResponse } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKeywords(items: string[] | undefined) {
  return Array.from(
    new Set((items || []).map((item) => item.trim().toLowerCase()).filter(Boolean)),
  );
}

export async function POST() {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: "Generate one new conversation for a university student brain training game.",
      config: {
        systemInstruction:
          "You create TOEFL Listening Part B style study material. Return valid JSON only. The JSON must have exactly these keys: topic, conversation, candidateKeywords, focusKeywords. Create a natural English campus conversation around 180 to 230 words. Format the conversation with one speaker turn per line. Every line must start with exactly 'Student A:' or 'Student B:'. Put a newline between turns. focusKeywords must contain exactly 3 best keywords for the main idea, lowercase, unique, and all three must be central. candidateKeywords must contain exactly 8 options, lowercase, unique, in random order, consisting of the same 3 focusKeywords, 2 secondary details from the conversation, and 3 distractor keywords that are mentioned but are not central to the main idea. Make the correct keywords clearly more central than the distractors. No markdown. No code fences.",
        responseMimeType: "application/json",
        responseJsonSchema: {
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
          required: ["topic", "conversation", "candidateKeywords", "focusKeywords"],
        },
      },
    });

    const parsed = extractJson<TOEFLGenerateResponse>(response.text ?? "");

    const focusKeywords = normalizeKeywords(parsed.focusKeywords).slice(0, 3);
    const candidateKeywords = normalizeKeywords([
      ...focusKeywords,
      ...(parsed.candidateKeywords || []),
    ]).slice(0, 8);

    const payload: TOEFLGenerateResponse = {
      topic: parsed.topic,
      conversation: parsed.conversation,
      candidateKeywords,
      focusKeywords,
    };

    if (!payload.topic || !payload.conversation || payload.candidateKeywords.length !== 8 || payload.focusKeywords.length !== 3) {
      throw new Error("Format respons AI tidak lengkap.");
    }

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
            : "Gagal membuat percakapan TOEFL.",
      },
      { status: 500 },
    );
  }
}
