import Phaser from "phaser";
import { getMobileUiScale } from "../mobileLayout";
import { PLATFORM_COUNT } from "./PlayScene";

export interface UiData {
  level: number;
  score: number;
  lives: number;
  timeLeft: number;
  useMobileTouch: boolean;
}

export class UiScene extends Phaser.Scene {
  private hudLevel!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudLives!: Phaser.GameObjects.Text;
  private hudTimer!: Phaser.GameObjects.Text;
  private hudTopPanel!: Phaser.GameObjects.Rectangle;
  private hudBottomPanel!: Phaser.GameObjects.Rectangle;

  private useMobileTouch = false;
  private level = 1;
  private score = 0;
  private lives = 3;
  private timeLeft = 300;
  private curPlat = 1;

  constructor() {
    super({ key: "UiScene" });
  }

  init(data: UiData): void {
    this.level = data.level;
    this.score = data.score;
    this.lives = data.lives;
    this.timeLeft = data.timeLeft;
    this.useMobileTouch = data.useMobileTouch;
  }

  create(): void {
    this.createHud();
    this.setupEvents();
    this.layoutHud();
    this.updateHudText();

    this.scale.on("resize", () => {
      this.layoutHud();
    });
  }

  private setupEvents(): void {
    const playScene = this.scene.get("PlayScene");
    playScene.events.on("updateScore", (score: number) => {
      this.score = score;
      this.updateHudText();
    });
    playScene.events.on("updateLives", (lives: number) => {
      this.lives = lives;
      this.updateHudText();
    });
    playScene.events.on("updateLevel", (level: number) => {
      this.level = level;
      this.updateHudText();
    });
    playScene.events.on("updateTimer", (timeLeft: number) => {
      this.timeLeft = timeLeft;
      this.updateHudText();
    });
    playScene.events.on("updatePlatform", (plat: number) => {
      this.curPlat = plat;
      this.updateHudText();
    });
    
    // Clean up on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      playScene.events.off("updateScore");
      playScene.events.off("updateLives");
      playScene.events.off("updateLevel");
      playScene.events.off("updateTimer");
      playScene.events.off("updatePlatform");
    });
  }

  private createHud(): void {
    // We use fully opaque backgrounds to separate menus clearly from the game void.
    this.hudTopPanel = this.add.rectangle(0, 0, 1, 1, 0x111622, 1).setOrigin(0, 0);
    this.hudBottomPanel = this.add.rectangle(0, 0, 1, 1, 0x111622, 1).setOrigin(0, 0);

    const ts = { fontFamily: "monospace", fontSize: "18px", color: "#ffffff" };
    this.hudLevel = this.add.text(0, 0, "", { ...ts, fontStyle: "bold" }).setOrigin(0.5, 0.5);
    this.hudScore = this.add.text(0, 0, "", ts).setOrigin(0.5, 0.5);
    this.hudLives = this.add.text(0, 0, "", ts).setOrigin(0.5, 0.5);
    this.hudTimer = this.add.text(0, 0, "", ts).setOrigin(0.5, 0.5);
  }

  private layoutHud(): void {
    const { width: viewW, height: viewH } = this.scale;
    const s = getMobileUiScale(this);
    const cx = viewW / 2;

    this.hudTopPanel.setVisible(true);
    this.hudBottomPanel.setVisible(true);
    this.hudScore.setVisible(true);
    this.hudLives.setVisible(true);
    this.hudTimer.setVisible(true);

    if (this.useMobileTouch) {
      // Mobile layout: Top Header has Level/Platform, Bottom Footer has Score/Health/Time
      const headerH = Math.round(50 * s);
      const footerH = Math.round(50 * s);

      this.hudTopPanel.setPosition(0, 0).setSize(viewW, headerH);
      this.hudLevel.setPosition(cx, headerH / 2).setFontSize(Math.round(20 * s));

      this.hudBottomPanel.setPosition(0, viewH - footerH).setSize(viewW, footerH);
      // We can center the single line text in the footer
      this.hudScore.setPosition(cx, viewH - footerH / 2).setFontSize(Math.round(16 * s));
      this.hudLives.setVisible(false);
      this.hudTimer.setVisible(false);
    } else {
      // Desktop full-width headers/footers
      const headerH = Math.round(44 * s);
      const footerH = Math.round(44 * s);

      this.hudTopPanel.setPosition(0, 0).setSize(viewW, headerH);
      this.hudLevel.setPosition(cx, headerH / 2).setFontSize(Math.round(20 * s));

      this.hudBottomPanel.setPosition(0, viewH - footerH).setSize(viewW, footerH);
      this.hudScore.setPosition(cx - Math.round(200 * s), viewH - footerH / 2).setFontSize(Math.round(18 * s));
      this.hudLives.setVisible(true);
      this.hudLives.setPosition(cx, viewH - footerH / 2).setFontSize(Math.round(18 * s));
      this.hudTimer.setVisible(true);
      this.hudTimer.setPosition(cx + Math.round(200 * s), viewH - footerH / 2).setFontSize(Math.round(18 * s));
    }
  }

  private updateHudText(): void {
    this.hudLevel.setText(`Level ${this.level}   Platform ${this.curPlat}/${PLATFORM_COUNT}`);
    if (this.useMobileTouch) {
      this.hudScore.setText(`Score: ${this.score}  ·  Health: ${this.lives}  ·  ${Math.floor(this.timeLeft)}s`);
    } else {
      this.hudScore.setText(`Score: ${this.score}`);
      this.hudLives.setText(`Health: ${this.lives}`);
      this.hudTimer.setText(`Time: ${Math.floor(this.timeLeft)}s`);
    }
  }

}
