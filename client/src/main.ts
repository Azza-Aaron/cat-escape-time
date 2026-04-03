import Phaser from "phaser";
import { BootScene, GAME_WIDTH } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { ScoreboardScene } from "./scenes/ScoreboardScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { PlayScene } from "./scenes/PlayScene";

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
  scene: [BootScene, MenuScene, ScoreboardScene, SettingsScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
