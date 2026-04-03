import Phaser from "phaser";
import { playMenuMusic } from "../audio/gameAudio";
import { fetchHighScores } from "../api/highScores";

export class ScoreboardScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "ScoreboardScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 48, "Top 5 Scores", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height * 0.35, "Loading…", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    const back = this.add
      .text(width / 2, height - 48, "Back to Menu", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#444466",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    back.on("pointerdown", () => this.scene.start("MenuScene"));

    playMenuMusic(this);
    void this.loadScores();
  }

  private async loadScores(): Promise<void> {
    try {
      const rows = await fetchHighScores(5);
      if (rows.length === 0) {
        this.statusText.setText("No scores yet. Be the first!");
        return;
      }
      const lines = rows.map(
        (r, i) =>
          `${i + 1}. ${r.playerName} — score ${r.score} — level ${r.levelReached}`
      );
      this.statusText.setText(lines.join("\n"));
      this.statusText.setOrigin(0.5, 0);
      this.statusText.setY(this.scale.height * 0.28);
    } catch (e) {
      this.statusText.setText(
        `Could not load scores.\n${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
