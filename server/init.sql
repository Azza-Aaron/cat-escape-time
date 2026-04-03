CREATE TABLE IF NOT EXISTS high_scores (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(64) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level_reached INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores (score DESC);
