import Phaser from "phaser";
import { BootScene, GAME_WIDTH } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { ScoreboardScene } from "./scenes/ScoreboardScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { PlayScene } from "./scenes/PlayScene";
import { UiScene } from "./scenes/UiScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: 640,
  backgroundColor: "#1a1a2e",
  input: {
    activePointers: 4,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
      overlapBias: 10,
    },
  },
  scene: [BootScene, MenuScene, ScoreboardScene, SettingsScene, PlayScene, UiScene],
  scale: {
    // Desktop: FIT shows the full 960×640 frame without cropping. Mobile ENVELOP is applied in BootScene.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
