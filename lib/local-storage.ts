import type { ClientGameSession } from "@/types/game";

const PLAYER_NAME_KEY = "brain-training:name";
const SESSION_KEY = "brain-training:session";

export function getPlayerName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PLAYER_NAME_KEY) ?? "";
}

export function savePlayerName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAYER_NAME_KEY, name.trim());
}

export function getSession(): ClientGameSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ClientGameSession;
  } catch {
    return null;
  }
}

export function startFreshSession(name: string) {
  if (typeof window === "undefined") return;

  const session: ClientGameSession = {
    name: name.trim(),
    scores: {},
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateSession(partial: Partial<ClientGameSession>) {
  if (typeof window === "undefined") return;

  const current = getSession() ?? {
    name: getPlayerName(),
    scores: {},
  };

  const next: ClientGameSession = {
    ...current,
    ...partial,
    scores: {
      ...current.scores,
      ...partial.scores,
    },
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
