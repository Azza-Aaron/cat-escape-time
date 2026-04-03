import Phaser from "phaser";
import {
  isMusicEnabled,
  isSfxEnabled,
  setMusicEnabled,
  setSfxEnabled,
} from "../audio/audioSettings";
import { playMenuMusic, stopMenuMusic } from "../audio/gameAudio";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: "SettingsScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const menuX = width * 0.34;

    this.add
      .text(menuX, height * 0.18, "Settings", {
        fontFamily: "Georgia, serif",
        fontSize: "36px",
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    this.add
      .text(menuX, height * 0.3, "Sound", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    let musicOn = isMusicEnabled();
    let sfxOn = isSfxEnabled();

    const musicLabel = this.add
      .text(menuX, height * 0.4, "", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#3a3a55",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const sfxLabel = this.add
      .text(menuX, height * 0.52, "", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#3a3a55",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const refreshLabels = (): void => {
      musicLabel.setText(`Music: ${musicOn ? "On" : "Off"}`);
      sfxLabel.setText(`Sound effects: ${sfxOn ? "On" : "Off"}`);
      musicLabel.setStyle({
        backgroundColor: musicOn ? "#2a4a2a" : "#4a2a2a",
      });
      sfxLabel.setStyle({
        backgroundColor: sfxOn ? "#2a4a2a" : "#4a2a2a",
      });
    };

    refreshLabels();

    musicLabel.on("pointerdown", () => {
      musicOn = !musicOn;
      setMusicEnabled(musicOn);
      if (musicOn) playMenuMusic(this);
      else stopMenuMusic();
      refreshLabels();
    });
    musicLabel.on("pointerover", () =>
      musicLabel.setAlpha(0.92)
    );
    musicLabel.on("pointerout", () => musicLabel.setAlpha(1));

    sfxLabel.on("pointerdown", () => {
      sfxOn = !sfxOn;
      setSfxEnabled(sfxOn);
      refreshLabels();
    });
    sfxLabel.on("pointerover", () => sfxLabel.setAlpha(0.92));
    sfxLabel.on("pointerout", () => sfxLabel.setAlpha(1));

    playMenuMusic(this);

    const back = this.add
      .text(menuX, height * 0.72, "Back to Menu", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#444466",
        padding: { x: 18, y: 9 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    back.on("pointerover", () => back.setStyle({ backgroundColor: "#555577" }));
    back.on("pointerout", () => back.setStyle({ backgroundColor: "#444466" }));
    back.on("pointerdown", () => this.scene.start("MenuScene"));
  }
}
