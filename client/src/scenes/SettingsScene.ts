import Phaser from "phaser";
import {
  isMusicEnabled,
  isSfxEnabled,
  setMusicEnabled,
  setSfxEnabled,
} from "../audio/audioSettings";
import { playMenuMusic, stopMenuMusic } from "../audio/gameAudio";
import { getMobileUiScale } from "../mobileLayout";
import { addFixedWidthMenuButton, menuButtonWidth } from "../menuUi";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: "SettingsScene" });
  }

  create(): void {
    const onResize = (): void => {
      this.scene.restart();
    };
    this.scale.on("resize", onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", onResize);
    });

    const width = this.scale.width;
    const height = this.scale.height;
    const s = getMobileUiScale(this);
    const cx = width / 2;
    const btnW = menuButtonWidth(this);
    const fs = Math.round(22 * s);
    const rowGap = Math.round(12 * s);
    const btnStep = Math.round(52 * s);

    let y = height * 0.14;

    this.add
      .text(cx, y, "Settings", {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(36 * s)}px`,
        color: "#f4e4bc",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);

    y += Math.round(56 * s);
    this.add
      .text(cx, y, "Sound", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(20 * s)}px`,
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);

    y += Math.round(48 * s);

    let musicOn = isMusicEnabled();
    let sfxOn = isSfxEnabled();

    const musicLabel = addFixedWidthMenuButton(this, cx, y, btnW, "", {
      fontPx: fs,
      textColor: "#ffffff",
      bg: musicOn ? "#2a4a2a" : "#4a2a2a",
      bgHover: "#3a3a55",
    });

    const refreshMusicText = (): void => {
      musicLabel.setText(`Music: ${musicOn ? "On" : "Off"}`);
      musicLabel.setStyle({
        backgroundColor: musicOn ? "#2a4a2a" : "#4a2a2a",
      });
    };
    refreshMusicText();

    musicLabel.on("pointerdown", () => {
      musicOn = !musicOn;
      setMusicEnabled(musicOn);
      if (musicOn) playMenuMusic(this);
      else stopMenuMusic();
      refreshMusicText();
    });
    musicLabel.on("pointerover", () => musicLabel.setAlpha(0.92));
    musicLabel.on("pointerout", () => musicLabel.setAlpha(1));

    y += btnStep + rowGap;

    const sfxLabel = addFixedWidthMenuButton(this, cx, y, btnW, "", {
      fontPx: fs,
      textColor: "#ffffff",
      bg: sfxOn ? "#2a4a2a" : "#4a2a2a",
      bgHover: "#3a3a55",
    });

    const refreshSfxText = (): void => {
      sfxLabel.setText(`Sound effects: ${sfxOn ? "On" : "Off"}`);
      sfxLabel.setStyle({
        backgroundColor: sfxOn ? "#2a4a2a" : "#4a2a2a",
      });
    };
    refreshSfxText();

    sfxLabel.on("pointerdown", () => {
      sfxOn = !sfxOn;
      setSfxEnabled(sfxOn);
      refreshSfxText();
    });
    sfxLabel.on("pointerover", () => sfxLabel.setAlpha(0.92));
    sfxLabel.on("pointerout", () => sfxLabel.setAlpha(1));

    playMenuMusic(this);

    y += btnStep + Math.round(24 * s);

    const back = addFixedWidthMenuButton(this, cx, y, btnW, "Back to Menu", {
      fontPx: fs,
      textColor: "#ffffff",
      bg: "#444466",
      bgHover: "#555577",
    });
    back.on("pointerdown", () => this.scene.start("MenuScene"));
  }
}
