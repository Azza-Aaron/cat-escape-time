import Phaser from "phaser";
import { playMenuMusic } from "../audio/gameAudio";
import { startCatMouseDemo } from "../game/catMouseDemo";
import { getMobileUiScale } from "../mobileLayout";
import { addFixedWidthMenuButton, menuButtonWidth } from "../menuUi";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const s = getMobileUiScale(this);
    const narrow = width < 640;
    const cx = width / 2;
    const btnW = menuButtonWidth(this);
    const fs = Math.round(22 * s);
    const rowGap = Math.round(12 * s);
    const btnStep = Math.round(56 * s);

    let y = height * 0.12;

    this.add
      .text(cx, y, "Cat Escape Time!", {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(40 * s)}px`,
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    y += Math.round(56 * s);
    this.add
      .text(cx, y, "Climb. Survive. Escape the window.", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(15 * s)}px`,
        color: "#aaaaaa",
        wordWrap: { width: width - 24 },
        align: "center",
      })
      .setOrigin(0.5);

    y += Math.round(40 * s);

    if (narrow) {
      startCatMouseDemo(this, cx, y + Math.round(36 * s), 1.88 * s, 380);
      y += Math.round(168 * s);
    } else {
      y = height * 0.46;
    }

    const play = addFixedWidthMenuButton(this, cx, y, btnW, "Play", {
      fontPx: Math.round(26 * s),
      textColor: "#7cfc00",
      bg: "#2a4a2a",
      bgHover: "#3a6a3a",
    });
    play.on("pointerdown", () => this.scene.start("PlayScene"));

    y += btnStep + rowGap;

    const scores = addFixedWidthMenuButton(this, cx, y, btnW, "Scoreboard", {
      fontPx: fs,
      textColor: "#87ceeb",
      bg: "#1a3a4a",
      bgHover: "#2a5a6a",
    });
    scores.on("pointerdown", () => this.scene.start("ScoreboardScene"));

    y += btnStep + rowGap;

    const settings = addFixedWidthMenuButton(this, cx, y, btnW, "Settings", {
      fontPx: fs,
      textColor: "#d4c4e8",
      bg: "#3a3550",
      bgHover: "#4a4560",
    });
    settings.on("pointerdown", () => this.scene.start("SettingsScene"));

    if (!narrow) {
      startCatMouseDemo(this, width * 0.76, height * 0.52, 1.48 * s, 380);
    }

    playMenuMusic(this);
  }
}
