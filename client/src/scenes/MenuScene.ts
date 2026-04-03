import Phaser from "phaser";
import { playMenuMusic } from "../audio/gameAudio";
import { getMobileUiScale } from "../mobileLayout";
import { startCatMouseDemo } from "../game/catMouseDemo";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const s = getMobileUiScale(this);

    const menuX = width < 560 ? width * 0.5 : width * 0.34;
    const catX = width < 560 ? width * 0.5 : width * 0.76;
    const catY = height * 0.52;

    this.add
      .text(menuX, height * 0.2, "Cat Escape Time!", {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(40 * s)}px`,
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    this.add
      .text(menuX, height * 0.32, "Climb. Survive. Escape the window.", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(15 * s)}px`,
        color: "#aaaaaa",
        wordWrap: { width: width - 24 },
      })
      .setOrigin(0.5);

    const play = this.add
      .text(menuX, height * 0.48, "Play", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(26 * s)}px`,
        color: "#7cfc00",
        backgroundColor: "#2a4a2a",
        padding: { x: Math.round(22 * s), y: Math.round(11 * s) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    play.on("pointerover", () => play.setStyle({ backgroundColor: "#3a6a3a" }));
    play.on("pointerout", () => play.setStyle({ backgroundColor: "#2a4a2a" }));
    play.on("pointerdown", () => this.scene.start("PlayScene"));

    const scores = this.add
      .text(menuX, height * 0.6, "Scoreboard", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(22 * s)}px`,
        color: "#87ceeb",
        backgroundColor: "#1a3a4a",
        padding: { x: Math.round(18 * s), y: Math.round(9 * s) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    scores.on("pointerover", () =>
      scores.setStyle({ backgroundColor: "#2a5a6a" })
    );
    scores.on("pointerout", () =>
      scores.setStyle({ backgroundColor: "#1a3a4a" })
    );
    scores.on("pointerdown", () => this.scene.start("ScoreboardScene"));

    const settings = this.add
      .text(menuX, height * 0.68, "Settings", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(22 * s)}px`,
        color: "#d4c4e8",
        backgroundColor: "#3a3550",
        padding: { x: Math.round(18 * s), y: Math.round(9 * s) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    settings.on("pointerover", () =>
      settings.setStyle({ backgroundColor: "#4a4560" })
    );
    settings.on("pointerout", () =>
      settings.setStyle({ backgroundColor: "#3a3550" })
    );
    settings.on("pointerdown", () => this.scene.start("SettingsScene"));

    startCatMouseDemo(this, catX, catY, 1.48 * s, 380);
    playMenuMusic(this);
  }
}
