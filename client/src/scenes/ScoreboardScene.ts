import Phaser from "phaser";
import { fetchHighScores } from "../api/highScores";
import { playMenuMusic } from "../audio/gameAudio";
import { getMobileUiScale } from "../mobileLayout";
import { addFixedWidthMenuButton, menuButtonWidth } from "../menuUi";

export class ScoreboardScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "ScoreboardScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const s = getMobileUiScale(this);

    this.add
      .text(width / 2, 48, "Top 5 Scores", {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(32 * s)}px`,
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height * 0.35, "Loading…", {
        fontFamily: "monospace",
        fontSize: `${Math.round(18 * s)}px`,
        color: "#cccccc",
        wordWrap: { width: width - 24 },
      })
      .setOrigin(0.5);

    const back = addFixedWidthMenuButton(
      this,
      width / 2,
      height - 52,
      menuButtonWidth(this),
      "Back to Menu",
      {
        fontPx: Math.round(20 * s),
        textColor: "#ffffff",
        bg: "#444466",
        bgHover: "#555577",
      }
    );
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
