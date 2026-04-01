export type ScoreBreakdown = {
  toefl: number;
  stroop: number;
  sequence: number;
  total: number;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  breakdown: ScoreBreakdown;
  createdAt: number;
};

export type ClientGameSession = {
  name: string;
  scores: Partial<ScoreBreakdown>;
  submittedEntryId?: string;
};

export type TOEFLGenerateResponse = {
  topic: string;
  conversation: string;
  candidateKeywords: string[];
  focusKeywords: string[];
};

export type KeywordVerdict = "relevant" | "partly relevant" | "not relevant";

export type TOEFLKeywordResult = {
  keyword: string;
  verdict: KeywordVerdict;
  reason: string;
  suggestedKeyword?: string;
  suggestedReason?: string;
};

export type TOEFLEvaluationResponse = {
  score: number;
  chosenKeywords: string[];
  idealKeywords: string[];
  feedback: string;
  perKeyword: TOEFLKeywordResult[];
  missedKeywords: Array<{
    keyword: string;
    reason: string;
  }>;
};
