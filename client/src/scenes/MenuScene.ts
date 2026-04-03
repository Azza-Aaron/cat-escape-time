import Phaser from "phaser";
import { playMenuMusic } from "../audio/gameAudio";
import { startCatMouseDemo } from "../game/catMouseDemo";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    const menuX = width * 0.34;
    const catX = width * 0.76;
    const catY = height * 0.52;

    this.add
      .text(menuX, height * 0.2, "Cat Escape Time!", {
        fontFamily: "Georgia, serif",
        fontSize: "40px",
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    this.add
      .text(menuX, height * 0.32, "Climb. Survive. Escape the window.", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    const play = this.add
      .text(menuX, height * 0.48, "Play", {
        fontFamily: "sans-serif",
        fontSize: "26px",
        color: "#7cfc00",
        backgroundColor: "#2a4a2a",
        padding: { x: 22, y: 11 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    play.on("pointerover", () => play.setStyle({ backgroundColor: "#3a6a3a" }));
    play.on("pointerout", () => play.setStyle({ backgroundColor: "#2a4a2a" }));
    play.on("pointerdown", () => this.scene.start("PlayScene"));

    const scores = this.add
      .text(menuX, height * 0.6, "Scoreboard", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#87ceeb",
        backgroundColor: "#1a3a4a",
        padding: { x: 18, y: 9 },
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
        fontSize: "22px",
        color: "#d4c4e8",
        backgroundColor: "#3a3550",
        padding: { x: 18, y: 9 },
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

    startCatMouseDemo(this, catX, catY, 1.48, 380);
    playMenuMusic(this);
  }
}
