import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT) || 3001;
const corsOrigin = process.env.CORS_ORIGIN?.trim() || true;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "32kb" }));

async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS high_scores (
      id SERIAL PRIMARY KEY,
      player_name VARCHAR(64) NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      level_reached INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores (score DESC)"
  );
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/high-scores", async (req, res) => {
  const raw = req.query.limit;
  const limit = Math.min(
    50,
    Math.max(1, parseInt(String(raw ?? "5"), 10) || 5)
  );
  try {
    const { rows } = await pool.query<{
      id: number;
      player_name: string;
      score: number;
      level_reached: number;
      created_at: string;
    }>(
      `SELECT id, player_name, score, level_reached, created_at
       FROM high_scores
       ORDER BY score DESC, level_reached DESC, created_at ASC
       LIMIT $1`,
      [limit]
    );
    res.json({
      scores: rows.map((r) => ({
        id: r.id,
        playerName: r.player_name,
        score: r.score,
        levelReached: r.level_reached,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/high-scores", async (req, res) => {
  const body = req.body as {
    playerName?: unknown;
    score?: unknown;
    levelReached?: unknown;
  };
  const name =
    typeof body.playerName === "string"
      ? body.playerName.trim().slice(0, 64)
      : "";
  const score = Number(body.score);
  const levelReached = Number(body.levelReached);
  if (!name || !Number.isFinite(score) || score < 0 || score > 1e12) {
    res.status(400).json({ error: "Invalid playerName or score" });
    return;
  }
  if (!Number.isFinite(levelReached) || levelReached < 0 || levelReached > 1e6) {
    res.status(400).json({ error: "Invalid levelReached" });
    return;
  }
  try {
    const { rows } = await pool.query<{
      id: number;
      player_name: string;
      score: number;
      level_reached: number;
      created_at: string;
    }>(
      `INSERT INTO high_scores (player_name, score, level_reached)
       VALUES ($1, $2, $3)
       RETURNING id, player_name, score, level_reached, created_at`,
      [name, Math.floor(score), Math.floor(levelReached)]
    );
    const r = rows[0];
    res.status(201).json({
      id: r.id,
      playerName: r.player_name,
      score: r.score,
      levelReached: r.level_reached,
      createdAt: r.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

async function start(): Promise<void> {
  try {
    await ensureSchema();
    app.listen(port, "0.0.0.0", () => {
      console.log(`API listening on ${port}`);
    });
  } catch (e) {
    console.error("Startup failed", e);
    process.exit(1);
  }
}

void start();
