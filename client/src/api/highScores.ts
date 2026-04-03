export type HighScoreRow = {
  id: number;
  playerName: string;
  score: number;
  levelReached: number;
  createdAt: string;
};

export function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

export async function fetchHighScores(limit = 5): Promise<HighScoreRow[]> {
  const r = await fetch(`${apiBase()}/api/high-scores?limit=${limit}`);
  if (!r.ok) throw new Error(`Scores unavailable (${r.status})`);
  const data = (await r.json()) as { scores: HighScoreRow[] };
  return data.scores;
}

export async function submitHighScore(body: {
  playerName: string;
  score: number;
  levelReached: number;
}): Promise<HighScoreRow> {
  const r = await fetch(`${apiBase()}/api/high-scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Submit failed (${r.status})`);
  }
  return r.json();
}
