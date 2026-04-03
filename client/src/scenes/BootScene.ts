import Phaser from "phaser";
import { preloadGameAudio } from "../audio/gameAudio";
import { startCatMouseDemo } from "../game/catMouseDemo";
import { getMobileUiScale } from "../mobileLayout";

/** Match game width in main.ts; platforms use 90% of this. */
export const GAME_WIDTH = 960;
export const PLATFORM_WIDTH = Math.floor(GAME_WIDTH * 0.9);

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

const FUR = 0xffaa66;
const FUR_D = 0xe8945c;

/** eyeShift: positive = looking right (toward mouse when cat faces right) */
function drawCatFull(
  g: Phaser.GameObjects.Graphics,
  opts: {
    walkFrame: number;
    eyeShift: number;
    tailPhase: number;
    swipePaw?: boolean;
  }
): void {
  const { walkFrame, eyeShift, tailPhase, swipePaw } = opts;
  const wf = walkFrame % 4;
  const lift = (a: boolean) => (a ? -5 : 0);

  let fl = false,
    fr = false,
    bl = false,
    br = false;
  if (wf === 0) {
    fl = true;
    br = true;
  } else if (wf === 2) {
    fr = true;
    bl = true;
  }

  g.fillStyle(FUR);
  g.fillRoundedRect(10, 18, 28, 22, 8);
  g.fillCircle(24, 14, 14);
  g.fillTriangle(12, 8, 16, 0, 20, 10);
  g.fillTriangle(28, 10, 32, 0, 36, 8);
  g.fillStyle(0xffb6c9);
  g.fillTriangle(14, 7, 16, 2, 18, 9);
  g.fillTriangle(30, 9, 32, 2, 34, 7);

  const ex1 = 18 + eyeShift;
  const ex2 = 30 + eyeShift;
  g.fillStyle(0xffffff);
  g.fillEllipse(ex1, 13, 8, 10);
  g.fillEllipse(ex2, 13, 8, 10);
  g.fillStyle(0x2d5016);
  g.fillEllipse(ex1, 14, 4, 6);
  g.fillEllipse(ex2, 14, 4, 6);
  g.fillStyle(0x000000);
  g.fillCircle(ex1, 14, 2);
  g.fillCircle(ex2, 14, 2);
  g.fillStyle(0xffffff);
  g.fillCircle(ex1 + 1, 12, 1.5);
  g.fillCircle(ex2 + 1, 12, 1.5);

  g.fillStyle(0xff9ec7);
  g.fillTriangle(23, 18, 21, 22, 27, 22);
  g.lineStyle(1.5, 0xcc6a3a);
  g.beginPath();
  g.arc(24, 24, 4, 0.1, Math.PI - 0.1, false);
  g.strokePath();
  g.lineStyle(1, 0xdddddd);
  g.beginPath();
  g.moveTo(6, 16);
  g.lineTo(2, 15);
  g.moveTo(6, 20);
  g.lineTo(1, 20);
  g.moveTo(42, 16);
  g.lineTo(46, 15);
  g.moveTo(42, 20);
  g.lineTo(47, 20);
  g.strokePath();

  g.fillStyle(FUR_D);
  g.fillRoundedRect(11 + lift(fl), 35 + lift(fl), 7, 10, 3);
  g.fillRoundedRect(20 + lift(fr), 35 + lift(fr), 7, 10, 3);
  g.fillRoundedRect(25 + lift(bl), 36 + lift(bl), 6, 9, 2);
  g.fillRoundedRect(33 + lift(br), 36 + lift(br), 6, 9, 2);

  if (swipePaw) {
    g.fillStyle(FUR);
    g.fillRoundedRect(36, 20, 14, 10, 4);
    g.fillRoundedRect(46, 14, 12, 9, 3);
    g.fillStyle(0xffffff);
    g.fillTriangle(52, 18, 56, 16, 56, 22);
    g.fillTriangle(54, 20, 58, 19, 58, 23);
    g.fillTriangle(50, 22, 54, 24, 50, 26);
  } else {
    const tp = tailPhase % 4;
    g.lineStyle(5, FUR);
    g.beginPath();
    g.moveTo(38, 28);
    const wag = Math.sin((tp * Math.PI) / 2) * 6;
    g.lineTo(44 + wag, 20);
    g.lineTo(50 + wag * 0.8, 12);
    g.strokePath();
  }
}

/** Big sparkly eyes + slightly rounder head for coin/heart pickup feedback. */
function drawCatJoy(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(FUR);
  g.fillRoundedRect(10, 18, 28, 22, 8);
  g.fillCircle(24, 14, 15);
  g.fillTriangle(12, 7, 16, -1, 20, 10);
  g.fillTriangle(28, 10, 32, -1, 36, 8);
  g.fillStyle(0xffb6c9);
  g.fillTriangle(14, 6, 16, 1, 18, 9);
  g.fillTriangle(30, 9, 32, 1, 34, 7);

  const ex1 = 18;
  const ex2 = 30;
  g.fillStyle(0xffffff);
  g.fillEllipse(ex1, 13, 15, 17);
  g.fillEllipse(ex2, 13, 15, 17);
  g.fillStyle(0x7ec8ff);
  g.fillEllipse(ex1, 14, 9, 11);
  g.fillEllipse(ex2, 14, 9, 11);
  g.fillStyle(0x1e4070);
  g.fillEllipse(ex1, 15, 5, 7);
  g.fillEllipse(ex2, 15, 5, 7);
  g.fillStyle(0xffffff);
  g.fillCircle(ex1 + 4, 10, 3);
  g.fillCircle(ex2 + 4, 10, 3);
  g.fillStyle(0x000000);
  g.fillCircle(ex1 + 2, 15, 2);
  g.fillCircle(ex2 + 2, 15, 2);

  g.fillStyle(0xff9ec7);
  g.fillTriangle(23, 20, 21, 24, 27, 24);
  g.lineStyle(1.5, 0xcc6a3a);
  g.beginPath();
  g.arc(24, 25, 4, 0.15, Math.PI - 0.15, false);
  g.strokePath();
  g.lineStyle(1, 0xdddddd);
  g.beginPath();
  g.moveTo(6, 16);
  g.lineTo(2, 15);
  g.moveTo(6, 20);
  g.lineTo(1, 20);
  g.moveTo(42, 16);
  g.lineTo(46, 15);
  g.moveTo(42, 20);
  g.lineTo(47, 20);
  g.strokePath();

  g.fillStyle(FUR_D);
  g.fillRoundedRect(11, 35, 7, 10, 3);
  g.fillRoundedRect(20, 35, 7, 10, 3);
  g.fillRoundedRect(25, 36, 6, 9, 2);
  g.fillRoundedRect(33, 36, 6, 9, 2);

  g.lineStyle(5, FUR);
  g.beginPath();
  g.moveTo(38, 28);
  g.lineTo(44, 20);
  g.lineTo(50, 12);
  g.strokePath();
}

function drawMouse(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x9e9e9e);
  g.fillEllipse(16, 10, 22, 12);
  g.fillStyle(0xc0c0c0);
  g.fillEllipse(12, 8, 8, 7);
  g.fillEllipse(20, 8, 8, 7);
  g.fillStyle(0x222222);
  g.fillCircle(22, 9, 2);
  g.fillStyle(0xffb6c9);
  g.fillEllipse(4, 10, 5, 3);
  g.lineStyle(2, 0x888888);
  g.beginPath();
  g.moveTo(26, 11);
  g.lineTo(30, 9);
  g.lineTo(30, 13);
  g.closePath();
  g.strokePath();
}

function drawCatSittingBase(
  g: Phaser.GameObjects.Graphics,
  tailSide: number,
  eyeShift: number,
  swipe: boolean
): void {
  g.fillStyle(FUR);
  g.fillRoundedRect(14, 26, 36, 26, 10);
  g.fillCircle(32, 18, 16);
  g.fillTriangle(18, 10, 22, 0, 26, 12);
  g.fillTriangle(38, 12, 42, 0, 46, 10);
  g.fillStyle(0xffb6c9);
  g.fillTriangle(20, 8, 22, 2, 24, 10);
  g.fillTriangle(40, 10, 42, 2, 44, 8);

  const ex1 = 26 + eyeShift;
  const ex2 = 38 + eyeShift;
  g.fillStyle(0xffffff);
  g.fillEllipse(ex1, 16, 8, 10);
  g.fillEllipse(ex2, 16, 8, 10);
  g.fillStyle(0x2d5016);
  g.fillEllipse(ex1, 17, 4, 6);
  g.fillEllipse(ex2, 17, 4, 6);
  g.fillStyle(0x000000);
  g.fillCircle(ex1, 17, 2);
  g.fillCircle(ex2, 17, 2);

  g.fillStyle(0xff9ec7);
  g.fillTriangle(31, 22, 29, 26, 35, 26);

  g.fillStyle(FUR_D);
  g.fillRoundedRect(20, 44, 10, 8, 3);
  g.fillRoundedRect(38, 44, 10, 8, 3);

  g.lineStyle(6, FUR);
  g.beginPath();
  g.moveTo(48, 36);
  const tx = 58 + tailSide * 8;
  const ty = 20 - tailSide * 5;
  g.lineTo(tx, ty);
  g.lineTo(54 + tailSide * 4, 12);
  g.strokePath();

  if (swipe) {
    g.fillStyle(FUR);
    g.fillRoundedRect(40, 24, 44, 20, 10);
    g.fillStyle(FUR_D);
    g.fillRoundedRect(44, 28, 36, 12, 6);
    g.fillStyle(FUR);
    g.fillEllipse(80, 30, 14, 12);
    g.fillStyle(0xffffff);
    g.fillTriangle(84, 24, 90, 26, 88, 30);
    g.fillTriangle(86, 28, 92, 30, 88, 34);
    g.fillTriangle(82, 32, 86, 36, 80, 36);
    g.lineStyle(2, 0xd4a574);
    g.beginPath();
    g.moveTo(48, 32);
    g.lineTo(58, 30);
    g.lineTo(72, 28);
    g.strokePath();
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.load.setBaseURL("");
    preloadGameAudio(this.load);
  }

  create(): void {
    const W = PLATFORM_WIDTH;
    makeTexture(this, "platform", W, 24, (g) => {
      g.fillStyle(0x5c4033);
      g.fillRect(0, 0, W, 24);
      g.fillStyle(0x3d2b22);
      g.fillRect(0, 18, W, 6);
      g.fillStyle(0x6a5245);
      for (let x = 8; x < W; x += 40) {
        g.fillRect(x, 4, 20, 2);
      }
    });

    makeTexture(this, "cat_idle", 48, 44, (g) =>
      drawCatFull(g, { walkFrame: 1, eyeShift: 0, tailPhase: 0 })
    );
    for (let f = 0; f < 4; f++) {
      makeTexture(this, `cat_walk_${f}`, 48, 44, (g) =>
        drawCatFull(g, { walkFrame: f, eyeShift: 0, tailPhase: f })
      );
    }
    makeTexture(this, "cat_track_0", 48, 44, (g) =>
      drawCatFull(g, { walkFrame: 1, eyeShift: 2, tailPhase: 0 })
    );
    makeTexture(this, "cat_track_1", 48, 44, (g) =>
      drawCatFull(g, { walkFrame: 1, eyeShift: 5, tailPhase: 0 })
    );
    makeTexture(this, "cat_swipe", 48, 44, (g) =>
      drawCatFull(g, {
        walkFrame: 1,
        eyeShift: 4,
        tailPhase: 0,
        swipePaw: true,
      })
    );

    makeTexture(this, "cat_joy", 48, 44, drawCatJoy);

    makeTexture(this, "cat_disgusted", 48, 44, (g) => {
      g.fillStyle(0xaabb99);
      g.fillRoundedRect(10, 18, 28, 22, 8);
      g.fillCircle(24, 14, 14);
      g.fillTriangle(12, 8, 16, 0, 20, 10);
      g.fillTriangle(28, 10, 32, 0, 36, 8);
      g.fillStyle(0x445544);
      g.fillEllipse(18, 13, 8, 10);
      g.fillEllipse(30, 13, 8, 10);
      g.fillStyle(0x222222);
      g.fillEllipse(18, 14, 5, 4);
      g.fillEllipse(30, 14, 5, 4);
      g.fillRect(20, 22, 8, 3);
      g.lineStyle(4, 0x88aa88);
      g.beginPath();
      g.moveTo(36, 28);
      g.lineTo(42, 22);
      g.lineTo(48, 14);
      g.strokePath();
      g.fillStyle(0x778877);
      g.fillRoundedRect(11, 36, 7, 10, 3);
      g.fillRoundedRect(20, 36, 7, 10, 3);
      g.fillRoundedRect(25, 38, 6, 8, 2);
      g.fillRoundedRect(33, 38, 6, 8, 2);
    });

    makeTexture(this, "ladder", 28, 120, (g) => {
      g.lineStyle(4, 0x8b7355);
      g.strokeRect(2, 0, 24, 120);
      for (let y = 10; y < 120; y += 18) {
        g.lineStyle(3, 0xa08060);
        g.beginPath();
        g.moveTo(4, y);
        g.lineTo(24, y);
        g.strokePath();
      }
    });
    makeTexture(this, "window", 48, 40, (g) => {
      g.fillStyle(0x87ceeb);
      g.fillRoundedRect(4, 4, 40, 32, 4);
      g.lineStyle(3, 0x333333);
      g.strokeRoundedRect(4, 4, 40, 32, 4);
      g.lineStyle(2, 0xffffff);
      g.beginPath();
      g.moveTo(24, 4);
      g.lineTo(24, 36);
      g.strokePath();
    });
    makeTexture(this, "window_open", 48, 40, (g) => {
      g.fillStyle(0x1d2b38);
      g.fillRoundedRect(4, 4, 40, 32, 4);
      g.fillStyle(0x0b1018);
      g.fillRoundedRect(9, 8, 30, 24, 3);
      g.fillStyle(0x6f4e37);
      g.fillRect(4, 4, 6, 32);
      g.fillRect(38, 4, 6, 32);
      g.lineStyle(3, 0x2b2b2b);
      g.strokeRoundedRect(4, 4, 40, 32, 4);
    });
    const drawKieIdle = (g: Phaser.GameObjects.Graphics): void => {
      g.fillStyle(0xc9a0e8);
      g.fillRoundedRect(10, 26, 28, 26, 9);
      g.fillStyle(0xffccaa);
      g.fillRoundedRect(4, 28, 9, 20, 4);
      g.fillRoundedRect(35, 28, 9, 20, 4);
      g.fillStyle(0xf5d4c0);
      g.fillCircle(24, 16, 13);
      g.fillStyle(0xffffff);
      g.fillEllipse(17, 14, 9, 10);
      g.fillEllipse(31, 14, 9, 10);
      g.fillStyle(0x6b4a3a);
      g.fillEllipse(17, 15, 4, 5);
      g.fillEllipse(31, 15, 4, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(19, 12, 2);
      g.fillCircle(33, 12, 2);
      g.fillStyle(0xffb6c8);
      g.fillEllipse(24, 20, 5, 3);
    };
    const drawKieWalk = (g: Phaser.GameObjects.Graphics): void => {
      g.fillStyle(0xc9a0e8);
      g.fillRoundedRect(10, 28, 28, 24, 8);
      g.fillStyle(0xffccaa);
      g.fillRoundedRect(3, 30, 9, 18, 4);
      g.fillRoundedRect(36, 30, 9, 18, 4);
      g.fillStyle(0xf5d4c0);
      g.fillCircle(24, 16, 13);
      g.fillStyle(0xffffff);
      g.fillEllipse(17, 14, 9, 10);
      g.fillEllipse(31, 14, 9, 10);
      g.fillStyle(0x6b4a3a);
      g.fillEllipse(17, 15, 4, 5);
      g.fillEllipse(31, 15, 4, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(19, 12, 2);
      g.fillCircle(33, 12, 2);
      g.fillStyle(0xffb6c8);
      g.fillEllipse(24, 20, 5, 3);
    };
    const drawKieThrow = (g: Phaser.GameObjects.Graphics): void => {
      g.fillStyle(0xc9a0e8);
      g.fillRoundedRect(10, 26, 28, 26, 9);
      g.fillStyle(0xffccaa);
      g.fillRoundedRect(6, 30, 10, 22, 4);
      g.fillRoundedRect(32, 30, 10, 22, 4);
      g.fillRoundedRect(2, 36, 8, 18, 3);
      g.fillRoundedRect(38, 36, 8, 18, 3);
      g.fillStyle(0xf5d4c0);
      g.fillCircle(24, 16, 13);
      g.fillStyle(0xffffff);
      g.fillEllipse(17, 14, 9, 10);
      g.fillEllipse(31, 14, 9, 10);
      g.fillStyle(0x6b4a3a);
      g.fillEllipse(17, 15, 4, 5);
      g.fillEllipse(31, 15, 4, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(19, 12, 2);
      g.fillCircle(33, 12, 2);
      g.fillStyle(0xffb6c8);
      g.fillEllipse(24, 21, 6, 4);
    };
    const drawKieDemonIdle = (g: Phaser.GameObjects.Graphics): void => {
      g.fillStyle(0x8f1d1d);
      g.fillRoundedRect(10, 26, 28, 26, 9);
      g.fillStyle(0xff7a3d);
      g.fillRoundedRect(4, 28, 9, 20, 4);
      g.fillRoundedRect(35, 28, 9, 20, 4);
      g.fillStyle(0xd13232);
      g.fillCircle(24, 16, 13);
      g.fillStyle(0x4a0d0d);
      g.fillTriangle(14, 8, 17, -1, 20, 8);
      g.fillTriangle(28, 8, 31, -1, 34, 8);
      g.fillStyle(0xfff3a0);
      g.fillEllipse(17, 14, 9, 10);
      g.fillEllipse(31, 14, 9, 10);
      g.fillStyle(0xff4a1c);
      g.fillEllipse(17, 15, 4, 6);
      g.fillEllipse(31, 15, 4, 6);
      g.fillStyle(0xfff8d2);
      g.fillCircle(19, 12, 2);
      g.fillCircle(33, 12, 2);
      g.fillStyle(0x1f0d0d);
      g.fillEllipse(24, 20, 6, 3);
    };
    const drawKieDemonWalk = (g: Phaser.GameObjects.Graphics): void => {
      g.fillStyle(0x8f1d1d);
      g.fillRoundedRect(10, 28, 28, 24, 8);
      g.fillStyle(0xff7a3d);
      g.fillRoundedRect(3, 30, 9, 18, 4);
      g.fillRoundedRect(36, 30, 9, 18, 4);
      g.fillStyle(0xd13232);
      g.fillCircle(24, 16, 13);
      g.fillStyle(0x4a0d0d);
      g.fillTriangle(14, 8, 17, -1, 20, 8);
      g.fillTriangle(28, 8, 31, -1, 34, 8);
      g.fillStyle(0xfff3a0);
      g.fillEllipse(17, 14, 9, 10);
      g.fillEllipse(31, 14, 9, 10);
      g.fillStyle(0xff4a1c);
      g.fillEllipse(17, 15, 4, 6);
      g.fillEllipse(31, 15, 4, 6);
      g.fillStyle(0xfff8d2);
      g.fillCircle(19, 12, 2);
      g.fillCircle(33, 12, 2);
      g.fillStyle(0x1f0d0d);
      g.fillEllipse(24, 20, 6, 3);
    };
    const drawKieDemonThrow = (g: Phaser.GameObjects.Graphics): void => {
      g.fillStyle(0x8f1d1d);
      g.fillRoundedRect(10, 26, 28, 26, 9);
      g.fillStyle(0xff7a3d);
      g.fillRoundedRect(6, 30, 10, 22, 4);
      g.fillRoundedRect(32, 30, 10, 22, 4);
      g.fillRoundedRect(2, 36, 8, 18, 3);
      g.fillRoundedRect(38, 36, 8, 18, 3);
      g.fillStyle(0xd13232);
      g.fillCircle(24, 16, 13);
      g.fillStyle(0x4a0d0d);
      g.fillTriangle(14, 8, 17, -1, 20, 8);
      g.fillTriangle(28, 8, 31, -1, 34, 8);
      g.fillStyle(0xfff3a0);
      g.fillEllipse(17, 14, 9, 10);
      g.fillEllipse(31, 14, 9, 10);
      g.fillStyle(0xff4a1c);
      g.fillEllipse(17, 15, 4, 6);
      g.fillEllipse(31, 15, 4, 6);
      g.fillStyle(0xfff8d2);
      g.fillCircle(19, 12, 2);
      g.fillCircle(33, 12, 2);
      g.fillStyle(0x1f0d0d);
      g.fillEllipse(24, 21, 7, 4);
    };
    makeTexture(this, "kie_idle", 48, 56, drawKieIdle);
    makeTexture(this, "kie_walk", 48, 56, drawKieWalk);
    makeTexture(this, "kie_throw", 48, 56, drawKieThrow);
    makeTexture(this, "kie_demon_idle", 48, 56, drawKieDemonIdle);
    makeTexture(this, "kie_demon_walk", 48, 56, drawKieDemonWalk);
    makeTexture(this, "kie_demon_throw", 48, 56, drawKieDemonThrow);
    makeTexture(this, "gold_flake", 16, 16, (g) => {
      g.fillStyle(0xffd700);
      g.fillCircle(8, 8, 7);
      g.fillStyle(0xffec80);
      g.fillCircle(5, 5, 2);
    });
    makeTexture(this, "pickup_gold", 28, 28, (g) => {
      g.fillStyle(0xffc20a);
      g.fillCircle(14, 14, 13);
      g.lineStyle(3, 0xc9a008);
      g.strokeCircle(14, 14, 13);
      g.fillStyle(0xfff0a0);
      g.fillCircle(9, 9, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(11, 7, 2.5);
    });
    makeTexture(this, "pickup_heart", 26, 24, (g) => {
      g.fillStyle(0xff5566);
      g.fillCircle(8, 8, 7);
      g.fillCircle(18, 8, 7);
      g.fillTriangle(1, 10, 13, 22, 25, 10);
      g.fillStyle(0xff99aa);
      g.fillCircle(8, 8, 3);
      g.fillCircle(18, 8, 3);
    });
    makeTexture(this, "cucumber", 24, 12, (g) => {
      g.fillStyle(0x228b22);
      g.fillRoundedRect(0, 2, 24, 10, 4);
    });
    const drawDogBody = (g: Phaser.GameObjects.Graphics, legOffset: number): void => {
      g.fillStyle(0xa5643a);
      g.fillRoundedRect(6, 16, 32, 14, 7);
      g.fillStyle(0xc98d58);
      g.fillCircle(22, 12, 11);
      // Ears
      g.fillStyle(0x8b4f2f);
      g.fillTriangle(12, 7, 16, 1, 19, 8);
      g.fillTriangle(25, 8, 28, 1, 32, 7);
      // Eyes
      g.fillStyle(0xffffff);
      g.fillEllipse(17, 11, 7, 8);
      g.fillEllipse(27, 11, 7, 8);
      g.fillStyle(0x2f1f14);
      g.fillCircle(17, 12, 2);
      g.fillCircle(27, 12, 2);
      g.fillStyle(0xffffff);
      g.fillCircle(18, 10, 1.2);
      g.fillCircle(28, 10, 1.2);
      // Tiny button nose + mouth tint
      g.fillStyle(0x1f1f1f);
      g.fillCircle(22, 15, 2.2);
      g.fillStyle(0xffb8c8);
      g.fillEllipse(22, 17, 3.5, 2);
      // Four tiny legs (offset for walk cycle)
      g.fillStyle(0x7b4a2f);
      g.fillRoundedRect(10, 28 + legOffset, 4, 4, 1);
      g.fillRoundedRect(17, 28 - legOffset, 4, 4, 1);
      g.fillRoundedRect(24, 28 + legOffset, 4, 4, 1);
      g.fillRoundedRect(31, 28 - legOffset, 4, 4, 1);
    };
    makeTexture(this, "dog", 44, 34, (g) => drawDogBody(g, 0));
    makeTexture(this, "dog_walk_0", 44, 34, (g) => drawDogBody(g, 1));
    makeTexture(this, "dog_walk_1", 44, 34, (g) => drawDogBody(g, -1));
    makeTexture(this, "ninja_dog", 44, 34, (g) => {
      g.fillStyle(0x30303a);
      g.fillRoundedRect(6, 16, 32, 14, 7);
      g.fillStyle(0x474757);
      g.fillCircle(22, 12, 11);
      g.fillStyle(0x23232d);
      g.fillTriangle(12, 7, 16, 1, 19, 8);
      g.fillTriangle(25, 8, 28, 1, 32, 7);
      g.fillStyle(0x1c1c25);
      g.fillRoundedRect(10, 6, 24, 6, 2);
      g.fillStyle(0xffffff);
      g.fillEllipse(17, 11, 6, 7);
      g.fillEllipse(27, 11, 6, 7);
      g.fillStyle(0x7e93ff);
      g.fillCircle(17, 12, 2);
      g.fillCircle(27, 12, 2);
      g.fillStyle(0xffffff);
      g.fillCircle(18, 10, 1.1);
      g.fillCircle(28, 10, 1.1);
      g.fillStyle(0x121212);
      g.fillCircle(22, 15, 2);
      g.fillStyle(0xff9fb8);
      g.fillEllipse(22, 17, 3.2, 1.9);
      g.fillStyle(0x2a2a34);
      g.fillRoundedRect(10, 28, 4, 4, 1);
      g.fillRoundedRect(17, 28, 4, 4, 1);
      g.fillRoundedRect(24, 28, 4, 4, 1);
      g.fillRoundedRect(31, 28, 4, 4, 1);
    });
    makeTexture(this, "dagger", 16, 8, (g) => {
      g.fillStyle(0xc0c0c0);
      g.fillTriangle(0, 4, 12, 0, 12, 8);
      g.fillStyle(0x654321);
      g.fillRect(12, 2, 4, 4);
    });

    makeTexture(this, "mouse", 34, 18, drawMouse);
    makeTexture(this, "cat_boot_sit_0", 88, 64, (g) =>
      drawCatSittingBase(g, -1, 0, false)
    );
    makeTexture(this, "cat_boot_sit_1", 88, 64, (g) =>
      drawCatSittingBase(g, 1, 0, false)
    );
    makeTexture(this, "cat_boot_look_0", 88, 64, (g) =>
      drawCatSittingBase(g, 0, 3, false)
    );
    makeTexture(this, "cat_boot_look_1", 88, 64, (g) =>
      drawCatSittingBase(g, 0, 7, false)
    );
    makeTexture(this, "cat_boot_swipe", 88, 64, (g) =>
      drawCatSittingBase(g, 0, 6, true)
    );

    this.anims.create({
      key: "cat_walk",
      frames: [
        { key: "cat_walk_0" },
        { key: "cat_walk_1" },
        { key: "cat_walk_2" },
        { key: "cat_walk_3" },
      ],
      frameRate: 11,
      repeat: -1,
    });

    this.anims.create({
      key: "cat_boot_wag",
      frames: [{ key: "cat_boot_sit_0" }, { key: "cat_boot_sit_1" }],
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: "kie_patrol",
      frames: [{ key: "kie_idle" }, { key: "kie_walk" }],
      frameRate: 5,
      repeat: -1,
    });

    this.anims.create({
      key: "kie_demon_patrol",
      frames: [{ key: "kie_demon_idle" }, { key: "kie_demon_walk" }],
      frameRate: 5,
      repeat: -1,
    });

    this.anims.create({
      key: "dog_walk",
      frames: [{ key: "dog_walk_0" }, { key: "dog_walk_1" }],
      frameRate: 5,
      repeat: -1,
    });

    this.showLoadingScreen();

    this.time.delayedCall(3600, () => {
      this.scene.start("MenuScene");
    });
  }

  private showLoadingScreen(): void {
    const { width, height } = this.scale;
    const s = getMobileUiScale(this);
    const leftX = width < 560 ? width * 0.5 : width * 0.26;
    const rightX = width < 560 ? width * 0.5 : width * 0.72;

    this.add
      .text(leftX, height * 0.22, "Cat Escape Time!", {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(36 * s)}px`,
        color: "#f4e4bc",
      })
      .setOrigin(0.5);

    const loading = this.add
      .text(leftX, height * 0.42, "Loading…", {
        fontFamily: "sans-serif",
        fontSize: `${Math.round(22 * s)}px`,
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    const cy = height * 0.52;
    startCatMouseDemo(this, rightX, cy, 1.65 * s, 520);

    this.tweens.add({
      targets: loading,
      alpha: 0.5,
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
  }
}
