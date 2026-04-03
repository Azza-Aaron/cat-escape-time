import Phaser from "phaser";
import {
  playLevelMusic,
  playSfx,
  stopLevelMusic,
  stopMenuMusic,
} from "../audio/gameAudio";
import { submitHighScore } from "../api/highScores";
import { GAME_WIDTH, PLATFORM_WIDTH } from "./BootScene";

const PLATFORM_COUNT = 6;
const TIMER_SECONDS = 300;
const LIVES_START = 3;
const TOP_WINDOW_INDICES = [3, 4, 5];
const IFRAMES_MS = 2200;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Procedural cat sprites are 44px tall; platform tiles 24px (`BootScene`), origin 0.5. */
const PLAYER_TEX_HALF_H = 22;
/** Kie sprites are 56px tall (`kie_idle` / `kie_walk` / `kie_throw`), origin 0.5. */
const KIE_TEX_HALF_H = 28;
/** Patrol dog / ninja dog sprites (`BootScene`), origin 0.5. */
const DOG_TEX_HALF_H = 17;

function pickupBodyHalfW(kind: "gold" | "heart"): number {
  return kind === "gold" ? 14 : 13;
}

const KIE_HUMAN_QUOTES = [
  "I should get some apples later.",
  "Maybe tea and apples after this.",
  "I should tidy this place up soon.",
  "A quiet day would be nice for once.",
  "Maybe I will bake an apple tart.",
];

const KIE_DEMON_QUOTES = [
  "I am Kie the dark lord.",
  "Bow before the dark flame!",
  "Your hope feeds my shadow.",
  "The abyss answers my call.",
  "I rule this tower of fear.",
];

const DOG_QUOTES = [
  "Bow wow",
  "Bark Bark",
  "Woof!",
  "Arf arf!",
  "Ruff ruff!",
  "Yip yip!",
];

const NINJA_ESCAPE_QUOTES = [
  "I'll be back!",
  "You got lucky, cat!",
  "Smoke and shadows!",
  "Until next time!",
  "This is not over!",
];

type KieMode = "human" | "monster";

interface LadderSeg {
  rect: Phaser.Geom.Rectangle;
  fromPlat: number;
  gfx: Phaser.GameObjects.Graphics;
}

export class PlayScene extends Phaser.Scene {
  private level = 1;
  private score = 0;
  private goldTotal = 0;
  private lives = LIVES_START;
  private timeLeft = TIMER_SECONDS;
  private timerEvent!: Phaser.Time.TimerEvent;

  private worldW = GAME_WIDTH;
  private worldH = 1200;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private platformBodies: Phaser.Physics.Arcade.Sprite[] = [];
  private ladderZones: LadderSeg[] = [];
  private goldOnPlatform: boolean[] = [];

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private kie!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private windowSprite!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  private windowOverlap?: Phaser.Physics.Arcade.Collider;

  private dogs!: Phaser.Physics.Arcade.Group;
  private ninjaDogs!: Phaser.Physics.Arcade.Group;
  private cucumbers!: Phaser.Physics.Arcade.Group;
  private daggers!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  /** After jumping off a ladder, ignore ladder overlap briefly */
  private ladderJumpGrace = 0;

  private kieMode: KieMode = "human";
  private kieTimer = 0;
  private kieDropTimer = 0;
  private kieThrowTimer = 0;

  private spawnTimer = 0;
  private ninjaSpawnTimer = 0;

  private onLadder = false;
  private ladderHint?: Phaser.GameObjects.Text;

  private invincibleUntil = 0;
  private disgustedUntil = 0;
  private fallInvulnUntil = 0;
  private hairEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  private lastSafePlatIdx = 0;
  /** Platform index the cat last "meowed" for; null until first grounded frame. */
  private meowLastPlatformIdx: number | null = null;
  private meowBubble?: Phaser.GameObjects.Container;
  private kieSpeechBubble?: Phaser.GameObjects.Container;

  private qteActive = false;
  private qteLetters: string[] = [];
  private qteIndex = 0;
  private qteDeadline = 0;
  private qteContainer?: Phaser.GameObjects.Container;
  private qteText?: Phaser.GameObjects.Text;

  private hudTimer!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private hudLives!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudBottomPanel!: Phaser.GameObjects.Rectangle;
  private hudTopPanel!: Phaser.GameObjects.Rectangle;

  private hazardCooldownUntil = 0;
  private gameOverHandled = false;

  private letterKeys: Partial<Record<string, Phaser.Input.Keyboard.Key>> = {};

  private idleMs = 0;
  private mousePlayBusy = false;
  private idleMouseSprite?: Phaser.GameObjects.Sprite;

  private kieDropCount = 0;
  private kiePatrolDir = 1;
  private kieThrowUntil = 0;
  private pickupJoyTween?: Phaser.Tweens.Tween;
  private pickupJoyActive = false;
  private levelTransitioning = false;

  constructor() {
    super({ key: "PlayScene" });
  }

  /** World Y for player origin so feet rest on platform top (matches one-way collider). */
  private yStandOnPlatform(plat: Phaser.Physics.Arcade.Sprite): number {
    const pb = plat.body as Phaser.Physics.Arcade.StaticBody;
    const platHalf = pb.halfHeight;
    return plat.y - platHalf - PLAYER_TEX_HALF_H;
  }

  create(): void {
    this.level = 1;
    this.score = 0;
    this.goldTotal = 0;
    this.lives = LIVES_START;
    this.timeLeft = TIMER_SECONDS;
    this.gameOverHandled = false;
    this.lastSafePlatIdx = 0;
    this.meowLastPlatformIdx = null;

    stopMenuMusic();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopLevelMusic();
    });

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.platforms = this.physics.add.staticGroup();
    this.dogs = this.physics.add.group({ runChildUpdate: true });
    this.ninjaDogs = this.physics.add.group({ runChildUpdate: true });
    this.cucumbers = this.physics.add.group();
    this.daggers = this.physics.add.group();
    this.pickups = this.physics.add.group({
      collideWorldBounds: true,
      bounceX: 0,
      bounceY: 0.1,
    });

    this.buildLevel();

    const p0 = this.platformBodies[0]!;
    this.player = this.physics.add.sprite(
      p0.x,
      this.yStandOnPlatform(p0),
      "cat_idle"
    );
    this.player.setDepth(6);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.setDragX(800);
    this.applyMoveCaps(false);

    this.physics.add.collider(
      this.player,
      this.platforms,
      undefined,
      (o1, o2) =>
        this.processOneWayPlatform(
          o1 as Phaser.Physics.Arcade.Sprite,
          o2 as Phaser.Physics.Arcade.Sprite
        ),
      this
    );
    this.physics.add.collider(this.dogs, this.platforms);
    this.physics.add.collider(this.ninjaDogs, this.platforms);

    this.physics.add.overlap(this.player, this.pickups, (_p, o) => {
      this.collectPickup(o as Phaser.Physics.Arcade.Sprite);
    });

    this.resetWindowOverlap();

    this.physics.add.overlap(
      this.player,
      this.dogs,
      (p, d) => this.handleDogOverlap(p as Phaser.Physics.Arcade.Sprite, d as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.ninjaDogs,
      (p, d) =>
        this.handleNinjaDogOverlap(
          p as Phaser.Physics.Arcade.Sprite,
          d as Phaser.Physics.Arcade.Sprite
        ),
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.cucumbers,
      () => this.triggerHazard("cucumber"),
      (p) => this.canTakeDamage(p as Phaser.Physics.Arcade.Sprite),
      this
    );

    this.physics.add.overlap(
      this.player,
      this.daggers,
      () => this.triggerHazard("dagger"),
      (p) => this.canTakeDamage(p as Phaser.Physics.Arcade.Sprite),
      this
    );

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyShift = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SHIFT
      );
      this.keySpace = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
      );
      for (let i = 0; i < LETTERS.length; i++) {
        const ch = LETTERS[i]!;
        const code =
          Phaser.Input.Keyboard.KeyCodes[
            ch as keyof typeof Phaser.Input.Keyboard.KeyCodes
          ];
        if (typeof code === "number") {
          this.letterKeys[ch] = this.input.keyboard.addKey(code);
        }
      }
    }

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.qteActive || this.gameOverHandled) return;
        this.timeLeft -= 1;
        this.updateHud();
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.updateHud();
          void this.gameOver("Time up!");
        }
      },
    });

    const panelX = 16;
    const panelY = this.scale.height - 124;
    this.hudBottomPanel = this.add
      .rectangle(panelX, panelY, 250, 108, 0x111827, 0.78)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x6d7f99, 0.9)
      .setScrollFactor(0)
      .setDepth(880);
    this.hudScore = this.add
      .text(panelX + 14, panelY + 12, "", {
        fontSize: "20px",
        color: "#f4f7ff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(881);
    this.hudLives = this.add
      .text(panelX + 14, panelY + 46, "", {
        fontSize: "20px",
        color: "#ff8c8c",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(881);
    this.hudTimer = this.add
      .text(panelX + 14, panelY + 78, "", {
        fontSize: "16px",
        color: "#ffd980",
      })
      .setScrollFactor(0)
      .setDepth(881);

    const topCx = this.scale.width / 2;
    this.hudTopPanel = this.add
      .rectangle(topCx, 10, 360, 44, 0x111827, 0.78)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x6d7f99, 0.9)
      .setScrollFactor(0)
      .setDepth(880);
    this.hudLevel = this.add
      .text(topCx, 18, "", {
        fontSize: "20px",
        color: "#f4f7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(881);

    this.updateHud();
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);

    playLevelMusic(this, this.level);
  }

  /** One-way: pass through only when moving up from below the deck (not every upward velocity). */
  private processOneWayPlatform(
    p: Phaser.Physics.Arcade.Sprite,
    pl: Phaser.Physics.Arcade.Sprite
  ): boolean {
    const body = p.body as Phaser.Physics.Arcade.Body;
    const pb = pl.body as Phaser.Physics.Arcade.StaticBody;
    if (!body || !pb) return false;
    // Require at least slight horizontal overlap; avoids side snagging but keeps edge stability.
    const overlapX = Math.min(body.right, pb.right) - Math.max(body.left, pb.left);
    if (overlapX <= 2) return false;

    const prevBottom = body.prev.y + body.height;
    const comingFromAbove = prevBottom <= pb.top + 14;
    if (!comingFromAbove) return false;

    // Moving upward should pass through one-way platforms.
    if (body.velocity.y < -8) return false;

    // Allow a generous landing/stand band to reduce frame-step fall-through.
    return body.bottom >= pb.top - 18 && body.bottom <= pb.top + 64;
  }

  private applyMoveCaps(sprint: boolean): void {
    const maxVx = sprint ? 520 : 340;
    this.player.setMaxVelocity(maxVx, 800);
  }

  private resetWindowOverlap(): void {
    this.windowOverlap?.destroy();
    this.windowOverlap = this.physics.add.overlap(
      this.player,
      this.windowSprite,
      () => this.tryEnterWindow()
    );
  }

  private buildLevel(): void {
    this.platformBodies.forEach((p) => p.destroy());
    this.platformBodies = [];
    this.ladderZones.forEach((l) => {
      l.gfx.destroy();
    });
    this.ladderZones = [];
    this.platforms.clear(true, true);
    this.pickups.clear(true, true);
    this.dogs.clear(true, true);
    this.ninjaDogs.clear(true, true);
    this.cucumbers.clear(true, true);
    this.daggers.clear(true, true);

    if (this.kie) this.kie.destroy();
    if (this.windowSprite) this.windowSprite.destroy();

    this.goldOnPlatform = Array(PLATFORM_COUNT).fill(false);

    this.worldH = Math.max(1200, 3 * this.level * 200);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);

    const margin = 140;
    const usable = this.worldH - margin * 2;
    const step = usable / (PLATFORM_COUNT + 0.5);
    const cx = this.worldW / 2;

    const py: number[] = [];
    for (let i = 0; i < PLATFORM_COUNT; i++) {
      py[i] = this.worldH - margin - i * step;
    }

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const plat = this.platforms.create(cx, py[i]!, "platform") as Phaser.Physics.Arcade.Sprite;
      plat.setData("idx", i);
      plat.refreshBody();
      this.platformBodies.push(plat);

      if (i < PLATFORM_COUNT - 1) {
        const pyLower = py[i]!;
        const pyUpper = py[i + 1]!;
        const gapTop = pyUpper + 12;
        const gapBottom = pyLower - 12;
        const h = Math.max(40, gapBottom - gapTop);
        const marginX = 36;
        const minLx = Math.round(cx - PLATFORM_WIDTH / 2 + marginX + 14);
        const maxLx = Math.round(cx + PLATFORM_WIDTH / 2 - marginX - 14);
        const lx = Phaser.Math.Between(minLx, maxLx);
        const rect = new Phaser.Geom.Rectangle(lx - 14, gapTop, 28, h);
        const gfx = this.add.graphics();
        gfx.setDepth(1);
        gfx.lineStyle(4, 0x8b7355);
        gfx.strokeRect(lx - 14, gapTop, 28, h);
        for (let yy = gapTop + 12; yy < gapBottom; yy += 20) {
          gfx.lineStyle(3, 0xa08060);
          gfx.beginPath();
          gfx.moveTo(lx - 12, yy);
          gfx.lineTo(lx + 12, yy);
          gfx.strokePath();
        }
        this.ladderZones.push({ rect, fromPlat: i, gfx });
      }
    }

    const topPlat = PLATFORM_COUNT - 1;
    const topPlatSpr = this.platformBodies[topPlat]!;
    const kieY = topPlatSpr.y - 12 - KIE_TEX_HALF_H;
    this.kie = this.physics.add.sprite(cx, kieY, "kie_idle");
    this.kie.body.setAllowGravity(false);
    this.kie.setImmovable(true);
    this.kie.setDepth(3);
    this.kie.play("kie_patrol");
    this.kiePatrolDir = 1;
    this.kie.setFlipX(false);

    const winIdx = Phaser.Math.RND.pick(TOP_WINDOW_INDICES) as number;
    const winPlat = this.platformBodies[winIdx]!;
    const winInset = 84;
    const wx = Phaser.Math.Between(
      Math.round(winPlat.x - PLATFORM_WIDTH / 2 + winInset),
      Math.round(winPlat.x + PLATFORM_WIDTH / 2 - winInset)
    );
    const wy = winPlat.y - 50;
    this.windowSprite = this.physics.add.staticSprite(wx, wy, "window");
    this.windowSprite.refreshBody();
    const wBody = this.windowSprite.body as Phaser.Physics.Arcade.StaticBody | undefined;
    wBody?.setSize(62, 56);
    this.windowSprite.setData("idx", winIdx);
    this.windowSprite.setDepth(4);
    if (this.player) {
      this.resetWindowOverlap();
    }

    this.kieMode = "human";
    this.kieTimer = this.humanDurationMs();
    this.kieDropTimer = 1500;
    this.kieThrowTimer = 800;
    this.kieDropCount = 0;
    this.kieThrowUntil = 0;
    this.spawnTimer = this.spawnInterval();
    this.ninjaSpawnTimer = this.ninjaSpawnInterval();
    this.levelTransitioning = false;

    const base = this.platformBodies[0];
    if (base) this.player?.setPosition(base.x, this.yStandOnPlatform(base));
    if (this.player) {
      const sx = this.player.scaleX < 0 ? -1 : 1;
      this.player.setScale(sx, 1);
      this.player.setAlpha(1);
      this.player.setVisible(true);
      this.player.setDepth(6);
    }
    this.invincibleUntil = 0;
    this.lastSafePlatIdx = 0;
    this.meowLastPlatformIdx = null;
    this.clearMeowBubble();
    this.clearKieSpeechBubble();
    this.clearIdleMousePlay();
    this.ladderJumpGrace = 0;
  }

  private threatBand(): "low" | "mid" | "high" {
    const idx = this.platformIndexForY(this.player?.y ?? this.worldH);
    if (idx <= 1) return "low";
    if (idx >= 4) return "high";
    return "mid";
  }

  private onKieModeChanged(): void {
    if (this.kieMode === "human") {
      playSfx(this, "sfx_kie_human", 0.5);
      this.showKieSpeechBubble(
        Phaser.Utils.Array.GetRandom(KIE_HUMAN_QUOTES) ?? KIE_HUMAN_QUOTES[0]!
      );
    } else {
      playSfx(this, "sfx_kie_demon", 0.55);
      this.showKieSpeechBubble(
        Phaser.Utils.Array.GetRandom(KIE_DEMON_QUOTES) ?? KIE_DEMON_QUOTES[0]!
      );
    }
  }

  /**
   * Low platforms -> more coins, middle -> even, high -> more cucumbers.
   * This is implemented by shifting how long Kie stays in human vs monster mode.
   */
  private humanDurationMs(): number {
    const band = this.threatBand();
    if (band === "low") return 9800;
    if (band === "high") return 3200;
    return 5600;
  }

  private monsterDurationMs(): number {
    const band = this.threatBand();
    if (band === "low") return 3200;
    if (band === "high") return 9800;
    return 5600;
  }

  /** Very slow early; speeds up as the round progresses; higher levels reduce interval further. */
  private spawnInterval(): number {
    const t = 1 - this.timeLeft / TIMER_SECONDS;
    const baseStart = 20000;
    const baseEnd = 9500;
    const fromTime = baseStart - t * (baseStart - baseEnd);
    const levelBoost = Math.max(0, this.level - 1) * 750;
    return Math.max(1100, fromTime - levelBoost);
  }

  private ninjaSpawnInterval(): number {
    const t = 1 - this.timeLeft / TIMER_SECONDS;
    const baseStart = 16000;
    const baseEnd = 7000;
    const fromTime = baseStart - t * (baseStart - baseEnd);
    const levelBoost = Math.max(0, this.level - 1) * 900;
    return Math.max(2400, fromTime - levelBoost);
  }

  private advanceLevel(): void {
    this.score += 500 + Math.floor(this.timeLeft) * 2;
    this.lives += 1;
    this.level += 1;
    this.buildLevel();
    this.updateHud();
    playSfx(this, "sfx_level", 0.45);
    playLevelMusic(this, this.level);
  }

  /** QTE per-letter time window by level: 4s, 3s, 2s, 1s. */
  private qteStepMs(): number {
    if (this.level <= 3) return 4000;
    if (this.level <= 6) return 3000;
    if (this.level <= 9) return 2000;
    return 1000;
  }

  private pickupFallTuning(): { velocityMul: number; gravityOffset: number } {
    if (this.level <= 3) return { velocityMul: 0.85, gravityOffset: -140 };
    if (this.level <= 6) return { velocityMul: 1, gravityOffset: 0 };
    if (this.level <= 9) return { velocityMul: 1.15, gravityOffset: 120 };
    return { velocityMul: 1.3, gravityOffset: 220 };
  }

  private cucumberThrowSpeed(): number {
    if (this.level <= 3) return 300;
    if (this.level <= 6) return 360;
    if (this.level <= 9) return 430;
    return 520;
  }

  private tryEnterWindow(): void {
    if (this.qteActive || this.gameOverHandled || this.levelTransitioning) return;
    this.levelTransitioning = true;

    const wb = this.windowSprite.body as Phaser.Physics.Arcade.StaticBody | undefined;
    if (wb) {
      this.windowSprite.setTexture("window_open");
      this.windowSprite.refreshBody();
    }

    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.player.setTexture("cat_track_1");

    this.tweens.add({
      targets: this.player,
      x: this.windowSprite.x,
      y: this.windowSprite.y + 6,
      alpha: 0.15,
      scaleX: this.player.flipX ? -0.84 : 0.84,
      scaleY: 0.84,
      duration: 280,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.player.setAlpha(1);
        this.player.setScale(this.player.flipX ? -1 : 1, 1);
        this.levelTransitioning = false;
        this.advanceLevel();
      },
    });
  }

  private updateHud(): void {
    const curPlat = this.player
      ? this.platformIndexForY(this.player.y) + 1
      : this.lastSafePlatIdx + 1;
    this.hudLevel.setText(`Level ${this.level}   Platform ${curPlat}/${PLATFORM_COUNT}`);
    this.hudScore.setText(`Score: ${this.score}`);
    this.hudLives.setText(`Health: ${this.lives}`);
    this.hudTimer.setText(`Time: ${this.timeLeft}s`);
  }

  private collectPickup(sprite: Phaser.Physics.Arcade.Sprite): void {
    if (!sprite.active) return;
    const kind = (sprite.getData("kind") as string) ?? "gold";
    // Pickups fall through platforms; credit the platform the cat is on, not pickup Y.
    const plat = this.platformIndexForY(this.player.y);
    if (kind === "gold") {
      this.goldOnPlatform[plat] = true;
      this.goldTotal += 1;
      this.score += 50;
    } else if (kind === "heart") {
      this.lives += 1;
      this.score += 25;
    }
    playSfx(this, "sfx_pickup", 0.42);
    playSfx(this, "sfx_purr", 0.42);
    this.playPickupJoyReaction();
    sprite.destroy();
    this.updateHud();
  }

  private catchNearbyPickups(): void {
    const pb = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!pb) return;
    const px = pb.center.x;
    const py = pb.center.y;
    for (const obj of this.pickups.getChildren()) {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      if (!s.active) continue;
      const sb = s.body as Phaser.Physics.Arcade.Body | undefined;
      if (!sb) continue;
      const dx = Math.abs(sb.center.x - px);
      const dy = Math.abs(sb.center.y - py);
      if (dx <= 30 && dy <= 34) {
        this.collectPickup(s);
      }
    }
  }

  private canTakeDamage(_p: Phaser.Physics.Arcade.Sprite): boolean {
    if (this.qteActive || this.gameOverHandled) return false;
    if (this.time.now < this.hazardCooldownUntil) return false;
    if (this.time.now < this.fallInvulnUntil) return false;
    return this.time.now >= this.invincibleUntil;
  }

  private handleDogOverlap(
    player: Phaser.Physics.Arcade.Sprite,
    dog: Phaser.Physics.Arcade.Sprite
  ): void {
    if (this.qteActive || this.gameOverHandled) return;
    const pb = player.body as Phaser.Physics.Arcade.Body | null;
    const db = dog.body as Phaser.Physics.Arcade.Body | null;
    if (!pb || !db) return;
    const stomp =
      pb.velocity.y > 40 && pb.bottom <= db.top + 12;
    if (stomp) {
      dog.destroy();
      this.score += 30;
      player.setVelocityY(-280);
      playSfx(this, "sfx_stomp", 0.4);
      this.updateHud();
      return;
    }
    if (this.canTakeDamage(player)) {
      this.triggerHazard("dog");
    }
  }

  private spawnNinjaSmoke(x: number, y: number): void {
    const puff = this.add.particles(x, y - 8, "gold_flake", {
      speed: { min: 50, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      lifespan: 420,
      quantity: 6,
      frequency: -1,
      tint: [0xb8bec8, 0x9097a6, 0x6e7688],
    }) as Phaser.GameObjects.Particles.ParticleEmitter;
    puff.setDepth(760);
    this.time.delayedCall(120, () => puff.stop());
    this.time.delayedCall(520, () => puff.destroy());
  }

  private handleNinjaDogOverlap(
    player: Phaser.Physics.Arcade.Sprite,
    dog: Phaser.Physics.Arcade.Sprite
  ): void {
    if (this.qteActive || this.gameOverHandled) return;
    const pb = player.body as Phaser.Physics.Arcade.Body | null;
    const db = dog.body as Phaser.Physics.Arcade.Body | null;
    if (!pb || !db) return;
    const stomp = pb.velocity.y > 40 && pb.bottom <= db.top + 12;
    if (stomp) {
      this.spawnNinjaSmoke(dog.x, dog.y);
      this.showDogSpeechBubble(
        dog,
        Phaser.Utils.Array.GetRandom(NINJA_ESCAPE_QUOTES) ?? "I'll be back!"
      );
      dog.destroy();
      this.score += 45;
      player.setVelocityY(-300);
      playSfx(this, "sfx_stomp", 0.42);
      this.updateHud();
      return;
    }
    if (this.canTakeDamage(player)) {
      this.triggerHazard("dog");
    }
  }

  private triggerHazard(_kind: string): void {
    if (this.qteActive || this.gameOverHandled) return;
    if (!this.canTakeDamage(this.player)) return;
    this.startQte();
  }

  private startQte(): void {
    if (this.qteActive) return;
    this.qteActive = true;
    playSfx(this, "sfx_qte", 0.5);
    this.clearIdleMousePlay();
    this.clearMeowBubble();
    this.player.anims.stop();
    this.physics.world.pause();
    this.timerEvent.paused = true;

    this.qteLetters = [0, 1, 2].map(() =>
      LETTERS.charAt(Phaser.Math.Between(0, LETTERS.length - 1))
    );
    this.qteIndex = 0;
    this.qteDeadline = this.time.now + this.qteStepMs();

    this.qteContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
    this.qteContainer.setScrollFactor(0);
    this.qteContainer.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 420, 160, 0x111122, 0.92);
    bg.setStrokeStyle(3, 0x88ff88);
    this.qteText = this.add.text(0, 0, "", {
      fontSize: "36px",
      color: "#ffffff",
      fontFamily: "monospace",
    });
    this.qteText.setOrigin(0.5);
    this.qteContainer.add([bg, this.qteText]);

    this.setDisgusted(true);
    this.spawnHairEffect();

    this.refreshQteDisplay();
  }

  private refreshQteDisplay(): void {
    if (!this.qteText) return;
    const cur = this.qteLetters[this.qteIndex] ?? "?";
    const rest = this.qteLetters.slice(this.qteIndex + 1).join(" ");
    this.qteText.setText(`Press: ${cur}\nNext: ${rest}\n\n${Math.max(0, Math.ceil((this.qteDeadline - this.time.now) / 1000))}s`);
  }

  private spawnHairEffect(): void {
    if (this.hairEmitter) {
      this.hairEmitter.stop();
      this.hairEmitter.destroy();
    }
    const p = this.add.particles(
      this.player.x,
      this.player.y - 20,
      "gold_flake",
      {
        speed: { min: 80, max: 180 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.35, end: 0 },
        lifespan: 500,
        quantity: 3,
        frequency: 40,
        tint: [0xffffee, 0xffddaa],
      }
    ) as Phaser.GameObjects.Particles.ParticleEmitter;
    p.setDepth(999);
    this.hairEmitter = p;
    this.time.delayedCall(600, () => {
      p.stop();
      this.time.delayedCall(400, () => p.destroy());
    });
  }

  private setDisgusted(on: boolean): void {
    if (on) {
      this.player.anims.stop();
      this.player.setTexture("cat_disgusted");
      this.disgustedUntil = this.time.now + 800;
    } else {
      this.player.setTexture("cat_idle");
      this.disgustedUntil = 0;
    }
  }

  private completeQte(success: boolean): void {
    this.qteContainer?.destroy(true);
    this.qteContainer = undefined;
    this.qteText = undefined;
    this.qteActive = false;

    this.physics.world.resume();
    this.timerEvent.paused = false;

    this.setDisgusted(false);
    this.hazardCooldownUntil = this.time.now + 700;

    if (success) {
      this.invincibleUntil = this.time.now + IFRAMES_MS;
      this.player.setAlpha(0.65);
      this.time.delayedCall(IFRAMES_MS, () => this.player.setAlpha(1));
      playSfx(this, "sfx_pickup", 0.28);
    } else {
      playSfx(this, "sfx_fail", 0.45);
      this.lives -= 1;
      this.updateHud();
      if (this.lives <= 0) {
        this.lives = 0;
        void this.gameOver("No lives left");
      }
    }
  }

  private async gameOver(reason: string): Promise<void> {
    if (this.gameOverHandled) return;
    this.gameOverHandled = true;
    if (reason !== "No lives left") {
      playSfx(this, "sfx_hurt", 0.5);
    }
    this.physics.world.pause();
    this.timerEvent.remove(false);

    const name = window.prompt(
      `${reason}\nFinal score: ${this.score} — Level reached: ${this.level}\nEnter your name for the leaderboard:`
    );
    const trimmed = (name ?? "").trim().slice(0, 64);
    if (trimmed) {
      try {
        await submitHighScore({
          playerName: trimmed,
          score: this.score,
          levelReached: this.level,
        });
      } catch (e) {
        console.error(e);
      }
    }

    this.scene.start("MenuScene");
  }

  private clearKieSpeechBubble(): void {
    this.kieSpeechBubble?.destroy(true);
    this.kieSpeechBubble = undefined;
  }

  private showKieSpeechBubble(line: string): void {
    this.clearKieSpeechBubble();
    const txt = this.add.text(0, -8, line, {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#2a2035",
      wordWrap: { width: 300, useAdvancedWrap: true },
      align: "center",
    });
    txt.setOrigin(0.5);

    const padX = 14;
    const padY = 10;
    const bw = txt.width + padX * 2;
    const bh = txt.height + padY * 2;
    const bubbleY = -6;

    const g = this.add.graphics();
    g.fillStyle(0xfff3de, 1);
    g.fillRoundedRect(-bw / 2, -bh / 2 + bubbleY, bw, bh, 12);
    g.lineStyle(2, 0x5a3a2a, 0.9);
    g.strokeRoundedRect(-bw / 2, -bh / 2 + bubbleY, bw, bh, 12);
    g.fillStyle(0xfff3de, 1);
    g.fillTriangle(-8, bh / 2 + bubbleY, 8, bh / 2 + bubbleY, 0, bh / 2 + bubbleY + 10);

    const c = this.add.container(this.kie.x, this.kie.y - 64);
    c.add([g, txt]);
    c.setDepth(700);
    c.setAlpha(0.98);
    this.kieSpeechBubble = c;

    this.tweens.add({
      targets: c,
      scale: { from: 0.82, to: 1 },
      duration: 140,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(3300, () => {
      if (!this.kieSpeechBubble || this.kieSpeechBubble !== c) return;
      this.tweens.add({
        targets: c,
        alpha: 0,
        y: c.y - 10,
        duration: 320,
        onComplete: () => {
          if (this.kieSpeechBubble === c) this.clearKieSpeechBubble();
        },
      });
    });
  }

  private updateKieSpeechBubble(): void {
    if (!this.kieSpeechBubble || this.kieSpeechBubble.alpha < 0.05) return;
    this.kieSpeechBubble.setPosition(this.kie.x, this.kie.y - 64);
  }

  private showDogSpeechBubble(dog: Phaser.Physics.Arcade.Sprite, line: string): void {
    const txt = this.add.text(0, -6, line, {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#2a2035",
    });
    txt.setOrigin(0.5);

    const padX = 10;
    const padY = 8;
    const bw = txt.width + padX * 2;
    const bh = txt.height + padY * 2;
    const g = this.add.graphics();
    g.fillStyle(0xf8fff3, 1);
    g.fillRoundedRect(-bw / 2, -bh / 2 - 2, bw, bh, 10);
    g.lineStyle(2, 0x4b6a45, 0.9);
    g.strokeRoundedRect(-bw / 2, -bh / 2 - 2, bw, bh, 10);
    g.fillStyle(0xf8fff3, 1);
    g.fillTriangle(-6, bh / 2 - 2, 6, bh / 2 - 2, 0, bh / 2 + 6);

    const c = this.add.container(dog.x, dog.y - 36);
    c.add([g, txt]);
    c.setDepth(650);
    c.setAlpha(0.98);
    this.tweens.add({
      targets: c,
      y: c.y - 8,
      alpha: 0,
      duration: 1200,
      delay: 400,
      ease: "Sine.easeIn",
      onComplete: () => c.destroy(true),
    });
  }

  private clearMeowBubble(): void {
    this.meowBubble?.destroy(true);
    this.meowBubble = undefined;
  }

  private showMeowBubble(): void {
    this.clearMeowBubble();
    playSfx(this, "sfx_meow", 0.38);
    const count = Phaser.Math.Between(1, 6);
    const line = Array(count).fill("meow").join(" ");

    const txt = this.add.text(0, -8, line, {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#2a2035",
    });
    txt.setOrigin(0.5);

    const padX = 16;
    const padY = 12;
    const bw = txt.width + padX * 2;
    const bh = txt.height + padY * 2;
    const bubbleY = -6;

    const g = this.add.graphics();
    g.fillStyle(0xfffef8, 1);
    g.fillRoundedRect(-bw / 2, -bh / 2 + bubbleY, bw, bh, 14);
    g.lineStyle(2, 0x4a4a6a, 0.9);
    g.strokeRoundedRect(-bw / 2, -bh / 2 + bubbleY, bw, bh, 14);
    g.fillStyle(0xfffef8, 1);
    g.fillTriangle(-8, bh / 2 + bubbleY, 8, bh / 2 + bubbleY, 0, bh / 2 + bubbleY + 12);

    const c = this.add.container(this.player.x, this.player.y - 78);
    c.add([g, txt]);
    c.setDepth(650);
    c.setAlpha(0.98);
    this.meowBubble = c;

    this.tweens.add({
      targets: c,
      scale: { from: 0.82, to: 1 },
      duration: 140,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(2800, () => {
      if (!this.meowBubble || this.meowBubble !== c) return;
      this.tweens.add({
        targets: c,
        alpha: 0,
        y: c.y - 10,
        duration: 320,
        onComplete: () => {
          if (this.meowBubble === c) this.clearMeowBubble();
        },
      });
    });
  }

  private maybeAnnounceNewPlatform(grounded: boolean): void {
    if (!grounded || this.qteActive || this.mousePlayBusy) return;
    if (
      this.meowLastPlatformIdx !== null &&
      this.lastSafePlatIdx !== this.meowLastPlatformIdx
    ) {
      this.showMeowBubble();
    }
    this.meowLastPlatformIdx = this.lastSafePlatIdx;
  }

  private updateMeowBubble(): void {
    if (!this.meowBubble || this.meowBubble.alpha < 0.05) return;
    this.meowBubble.setPosition(this.player.x, this.player.y - 78);
  }

  private updateLastSafePlatform(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down && !body.touching.down) return;
    const half = PLATFORM_WIDTH / 2 - 8;
    const feetX = body.center.x;
    for (let i = 0; i < this.platformBodies.length; i++) {
      const plat = this.platformBodies[i];
      const top = plat.y - 12;
      if (
        body.bottom >= top - 6 &&
        body.bottom <= top + 14 &&
        feetX >= plat.x - half &&
        feetX <= plat.x + half
      ) {
        this.lastSafePlatIdx = i;
        break;
      }
    }
  }

  private respawnFromFall(): void {
    this.lives -= 1;
    this.updateHud();
    if (this.lives <= 0) {
      this.lives = 0;
      void this.gameOver("Fell off!");
      return;
    }
    const plat = this.platformBodies[this.lastSafePlatIdx] ?? this.platformBodies[0];
    if (plat) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(plat.x, this.yStandOnPlatform(plat));
    }
    this.fallInvulnUntil = this.time.now + 2000;
    this.player.setAlpha(0.45);
    this.time.delayedCall(2000, () => this.player.setAlpha(1));
    this.meowLastPlatformIdx = this.lastSafePlatIdx;
    this.clearMeowBubble();
  }

  private checkFallDeath(): void {
    if (this.qteActive || this.gameOverHandled) return;
    if (this.time.now < this.fallInvulnUntil) return;
    if (this.player.y < this.worldH + 40) return;
    this.respawnFromFall();
  }

  private updateIdleMouseInteraction(
    grounded: boolean,
    moving: boolean,
    climbing: boolean
  ): void {
    if (this.mousePlayBusy) return;
    if (
      this.qteActive ||
      !grounded ||
      climbing ||
      this.onLadder
    ) {
      this.idleMs = 0;
      return;
    }
    const input =
      this.keyA.isDown ||
      this.keyD.isDown ||
      this.keyW.isDown ||
      this.keyS.isDown ||
      this.keySpace.isDown ||
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.cursors.up.isDown ||
      this.cursors.down.isDown ||
      (this.keyShift?.isDown ?? false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (
      moving ||
      input ||
      Math.abs(body.velocity.x) > 14
    ) {
      this.idleMs = 0;
      return;
    }
    this.idleMs += this.game.loop.delta;
    if (this.idleMs >= 1000) {
      this.idleMs = 0;
      this.playIdleMouseSwipe();
    }
  }

  private playIdleMouseSwipe(): void {
    if (this.mousePlayBusy) return;
    this.mousePlayBusy = true;
    this.player.anims.stop();
    const flip = this.player.flipX;
    const dir = flip ? -1 : 1;
    const startX = this.player.x + dir * 62;
    // Pass across the cat front once.
    const passX = this.player.x - dir * 26;
    // Come back toward the original side before swipe.
    const returnX = this.player.x + dir * 14;
    // Mouse escapes opposite side after swipe miss.
    const escapeX = this.player.x - dir * 58;
    const my = this.player.y + 2;
    const mouse = this.add.sprite(startX, my, "mouse");
    mouse.setDepth(450);
    mouse.setAlpha(0);
    if (flip) mouse.setFlipX(true);
    mouse.setScale(1.35);
    this.idleMouseSprite = mouse;

    this.player.setTexture("cat_idle");
    // Eyes follow incoming mouse.
    this.time.delayedCall(100, () => {
      if (!this.mousePlayBusy) return;
      this.player.setTexture("cat_track_0");
    });
    this.time.delayedCall(220, () => {
      if (!this.mousePlayBusy) return;
      this.player.setTexture("cat_track_1");
    });

    this.tweens.add({
      targets: mouse,
      alpha: 1,
      x: passX,
      duration: 460,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (!this.mousePlayBusy) return;
        // Eyes switch as mouse changes side.
        this.player.setTexture("cat_track_0");
        this.tweens.add({
          targets: mouse,
          x: returnX,
          duration: 320,
          ease: "Sine.easeInOut",
          onComplete: () => {
            if (!this.mousePlayBusy) return;
            // Slightly shorter swipe timing / reach feel: swipe while mouse is just out of range.
            this.player.setTexture("cat_swipe");
            this.time.delayedCall(130, () => {
              if (!this.mousePlayBusy) return;
              this.tweens.add({
                targets: mouse,
                x: escapeX,
                y: my - 6,
                alpha: 0,
                duration: 220,
                ease: "Sine.easeOut",
                onComplete: () => {
                  mouse.destroy();
                  this.idleMouseSprite = undefined;
                  // Miss reaction: upset for a moment, then idle.
                  this.player.setTexture("cat_disgusted");
                  this.time.delayedCall(280, () => {
                    this.player.setTexture("cat_idle");
                    this.mousePlayBusy = false;
                  });
                },
              });
            });
          },
        });
      },
    });
  }

  private clearIdleMousePlay(): void {
    this.idleMouseSprite?.destroy();
    this.idleMouseSprite = undefined;
    this.mousePlayBusy = false;
    this.idleMs = 0;
  }

  private updateCatAnimation(opts: {
    grounded: boolean;
    moving: boolean;
    climbing: boolean;
    sprint: boolean;
  }): void {
    if (this.qteActive) return;
    if (this.mousePlayBusy) return;
    if (this.pickupJoyActive) {
      this.player.anims.stop();
      this.player.setTexture("cat_joy");
      return;
    }
    if (this.time.now < this.disgustedUntil) {
      this.player.anims.stop();
      this.player.setTexture("cat_disgusted");
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const inAir = !opts.grounded;
    const airBusy =
      inAir &&
      (Math.abs(body.velocity.x) > 22 ||
        Math.abs(body.velocity.y) > 70);
    const walk =
      (opts.grounded && opts.moving) || opts.climbing || airBusy;
    if (walk) {
      this.player.anims.play("cat_walk", true);
      let ts = 1.1;
      if (inAir) {
        ts = body.velocity.y < -100 ? 2.05 : 1.55;
      } else if (opts.sprint) {
        ts = 1.7;
      } else if (opts.moving) {
        ts = 1.25;
      }
      this.player.anims.timeScale = ts;
    } else {
      this.player.anims.stop();
      this.player.anims.timeScale = 1;
      this.player.setTexture("cat_idle");
    }
  }

  update(time: number): void {
    if (this.gameOverHandled) return;
    if (this.levelTransitioning) return;

    if (this.qteActive) {
      this.handleQteInput(time);
      if (this.hairEmitter) {
        this.hairEmitter.setPosition(this.player.x, this.player.y - 20);
      }
      return;
    }

    this.updateLastSafePlatform();
    this.updateHud();
    this.catchNearbyPickups();
    this.checkFallDeath();

    const sprint = this.keyShift?.isDown ?? false;
    this.applyMoveCaps(sprint);
    this.updateLadderState();
    this.updatePlayerMovement(sprint);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    const moving =
      Math.abs(body.velocity.x) > 28 ||
      (grounded &&
        (this.keyA.isDown ||
          this.keyD.isDown ||
          this.cursors.left.isDown ||
          this.cursors.right.isDown));
    const climbing =
      this.onLadder &&
      (this.keyW.isDown ||
        this.keyS.isDown ||
        this.cursors.up.isDown ||
        this.cursors.down.isDown);

    if (time < this.disgustedUntil) {
      this.player.anims.stop();
      this.player.setTexture("cat_disgusted");
    } else {
      this.updateIdleMouseInteraction(!!grounded, moving, climbing);
      this.updateCatAnimation({
        grounded: !!grounded,
        moving,
        climbing,
        sprint,
      });
    }

    this.maybeAnnounceNewPlatform(!!grounded);
    this.updateMeowBubble();

    this.updateKie(time);
    this.updateSpawns(time);
    this.updateDogAi();
    this.updateNinjaAi(time);
    this.cleanupProjectiles();
  }

  private handleQteInput(time: number): void {
    if (!this.qteText) return;
    if (time > this.qteDeadline) {
      this.completeQte(false);
      return;
    }
    const expected = this.qteLetters[this.qteIndex];
    if (!expected) {
      this.completeQte(true);
      return;
    }
    for (let i = 0; i < LETTERS.length; i++) {
      const ch = LETTERS[i]!;
      const key = this.letterKeys[ch];
      if (!key) continue;
      if (!Phaser.Input.Keyboard.JustDown(key)) continue;
      if (ch === expected) {
        this.qteIndex += 1;
        if (this.qteIndex >= this.qteLetters.length) {
          this.completeQte(true);
        } else {
          this.qteDeadline = time + this.qteStepMs();
        }
      } else {
        this.completeQte(false);
      }
      return;
    }
    this.refreshQteDisplay();
  }

  private updateLadderState(): void {
    const pbody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.ladderJumpGrace > 0) {
      this.ladderJumpGrace -= this.game.loop.delta;
      if (this.ladderJumpGrace < 0) this.ladderJumpGrace = 0;
      this.onLadder = false;
      pbody.allowGravity = true;
      return;
    }

    this.onLadder = false;
    let current: LadderSeg | undefined;
    const bounds = this.player.getBounds();
    const pr = new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
    const grounded = pbody.blocked.down || pbody.touching.down;
    const wantsLadderMove =
      this.keyW.isDown ||
      this.cursors.up.isDown ||
      this.keyS.isDown ||
      this.cursors.down.isDown;
    for (const seg of this.ladderZones) {
      if (!Phaser.Geom.Rectangle.Overlaps(pr, seg.rect)) continue;
      // Standing on a platform under a ladder overlaps the same rect; only climb when
      // pressing up/down (or when in the air on the ladder — not while jumping up through).
      if (grounded && !wantsLadderMove) continue;
      if (!grounded && pbody.velocity.y < -130) continue;
      this.onLadder = true;
      current = seg;
      break;
    }

    if (this.onLadder && current) {
      if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
        this.ladderJumpGrace = 320;
        pbody.allowGravity = true;
        this.player.setVelocityX(0);
        this.player.setVelocityY(-420);
        this.hideLadderHint();
        this.onLadder = false;
        return;
      }

      pbody.allowGravity = false;
      const up = this.keyW.isDown || this.cursors.up.isDown;
      const down = this.keyS.isDown || this.cursors.down.isDown;
      let vy = 0;
      if (up) vy = -220;
      else if (down) vy = 220;
      this.player.setVelocityX(0);
      this.player.setVelocityY(vy);

      if (up && !this.goldOnPlatform[current.fromPlat]) {
        const midY = current.rect.y + current.rect.height / 2;
        if (this.player.y < midY - 20) {
          this.player.y = midY - 18;
          this.player.setVelocityY(0);
          this.showLadderHint("Collect gold on this platform first.");
        }
      } else {
        this.hideLadderHint();
      }
    } else {
      pbody.allowGravity = true;
      this.hideLadderHint();
    }
  }

  private showLadderHint(msg: string): void {
    if (!this.ladderHint) {
      this.ladderHint = this.add.text(this.scale.width / 2, 120, msg, {
        fontSize: "16px",
        color: "#ffaaaa",
      });
      this.ladderHint.setScrollFactor(0);
      this.ladderHint.setOrigin(0.5);
      this.ladderHint.setDepth(500);
    } else {
      this.ladderHint.setText(msg);
    }
  }

  private hideLadderHint(): void {
    this.ladderHint?.destroy();
    this.ladderHint = undefined;
  }

  private beginKieThrowPose(): void {
    this.kieThrowUntil = this.time.now + 280;
  }

  private spawnKiePickup(kind: "gold" | "heart"): void {
    this.beginKieThrowPose();
    const tex = kind === "gold" ? "pickup_gold" : "pickup_heart";
    const topPlat = this.platformBodies[PLATFORM_COUNT - 1];
    let px = this.kie.x;
    if (topPlat) {
      const inset = Math.max(48, pickupBodyHalfW(kind) + 22);
      const minX = topPlat.x - PLATFORM_WIDTH / 2 + inset;
      const maxX = topPlat.x + PLATFORM_WIDTH / 2 - inset;
      px = Phaser.Math.Clamp(px, minX, maxX);
    }
    const py = this.kie.y + 30;
    const p = this.pickups.create(px, py, tex) as Phaser.Physics.Arcade.Sprite;
    p.setData("kind", kind);
    p.setDepth(15);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setCollideWorldBounds(true);
    body.setBounce(0, 0.1);
    // Make pickups slightly easier to catch on direct contact.
    if (kind === "gold") body.setSize(32, 32, true);
    else body.setSize(30, 30, true);
    body.setMaxVelocity(520, 980);
    const tuning = this.pickupFallTuning();
    body.setGravityY(tuning.gravityOffset);
    p.setVelocity(0, Phaser.Math.Between(110, 165) * tuning.velocityMul);
    p.refreshBody();
  }

  private playPickupJoyReaction(): void {
    this.pickupJoyTween?.stop();
    this.pickupJoyActive = true;
    this.player.anims.stop();
    this.player.setTexture("cat_joy");
    const fx = this.player.flipX ? -1 : 1;
    this.player.setScale(fx, 1);
    this.pickupJoyTween = this.tweens.add({
      targets: this.player,
      scaleX: fx * 1.38,
      scaleY: 1.38,
      duration: 175,
      ease: "Sine.easeInOut",
      yoyo: true,
      onComplete: () => {
        this.player.setScale(fx, 1);
        this.pickupJoyActive = false;
      },
    });
  }

  private updatePlayerMovement(sprint: boolean): void {
    if (this.onLadder) return;

    const left = this.keyA.isDown || this.cursors.left.isDown;
    const right = this.keyD.isDown || this.cursors.right.isDown;
    const jump =
      Phaser.Input.Keyboard.JustDown(this.keySpace) ||
      Phaser.Input.Keyboard.JustDown(this.keyW) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up);

    const accel = sprint ? 2600 : 1700;
    if (left) {
      this.player.setAccelerationX(-accel);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setAccelerationX(accel);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0);
    }

    const grounded =
      this.player.body.blocked.down || this.player.body.touching.down;
    if (jump && grounded) {
      this.player.setVelocityY(-420);
      playSfx(this, "sfx_jump", 0.35);
    }
  }

  private updateKie(_time: number): void {
    const topIdx = PLATFORM_COUNT - 1;
    const plat = this.platformBodies[topIdx];
    if (plat) {
      const halfK = 24;
      const left = plat.x - PLATFORM_WIDTH / 2 + halfK;
      const right = plat.x + PLATFORM_WIDTH / 2 - halfK;
      const spd = 86;
      const dt = this.game.loop.delta / 1000;
      this.kie.x += this.kiePatrolDir * spd * dt;
      if (this.kie.x <= left) {
        this.kie.x = left;
        this.kiePatrolDir = 1;
      } else if (this.kie.x >= right) {
        this.kie.x = right;
        this.kiePatrolDir = -1;
      }
      this.kie.setFlipX(this.kiePatrolDir < 0);
      const kb = this.kie.body as Phaser.Physics.Arcade.Body;
      kb.setVelocity(0, 0);
      this.updateKieSpeechBubble();
    }

    const kiePatrolAnim =
      this.kieMode === "human" ? "kie_patrol" : "kie_demon_patrol";
    const kieThrowTex =
      this.kieMode === "human" ? "kie_throw" : "kie_demon_throw";
    if (this.time.now < this.kieThrowUntil) {
      this.kie.anims.stop();
      this.kie.setTexture(kieThrowTex);
    } else {
      const cur = this.kie.anims.currentAnim;
      if (!cur || cur.key !== kiePatrolAnim) {
        this.kie.play(kiePatrolAnim, true);
      }
    }

    this.kieTimer -= this.game.loop.delta;
    if (this.kieTimer <= 0) {
      this.kieMode = this.kieMode === "human" ? "monster" : "human";
      this.kieTimer =
        this.kieMode === "human"
          ? this.humanDurationMs()
          : this.monsterDurationMs();
      this.onKieModeChanged();
    }

    if (this.kieMode === "human") {
      this.kieDropTimer -= this.game.loop.delta;
      if (this.kieDropTimer <= 0) {
        this.kieDropTimer = 1150;
        let kind: "gold" | "heart" =
          this.kieDropCount === 0 ? "gold" : Math.random() < 0.92 ? "gold" : "heart";
        this.kieDropCount += 1;
        this.spawnKiePickup(kind);
      }
    } else {
      this.kieThrowTimer -= this.game.loop.delta;
      if (this.kieThrowTimer <= 0) {
        this.kieThrowTimer = 900;
        this.beginKieThrowPose();
        const hx = this.kie.x + (this.kie.flipX ? -10 : 10);
        const hy = this.kie.y + 28;
        const c = this.cucumbers.create(hx, hy, "cucumber") as Phaser.Physics.Arcade.Sprite;
        const dx = this.player.x - hx;
        const dy = this.player.y - hy + 100;
        const len = Math.hypot(dx, dy) || 1;
        const speed = this.cucumberThrowSpeed();
        c.setVelocity((dx / len) * speed, (dy / len) * speed);
        const cb = c.body as Phaser.Physics.Arcade.Body;
        cb.allowGravity = false;
        // Tighten width so side grazes feel less unfair.
        cb.setSize(12, 8, true);
      }
    }
  }

  private platformIndexForY(worldY: number): number {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.platformBodies.length; i++) {
      const plat = this.platformBodies[i];
      const d = Math.abs(worldY - plat.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  private updateSpawns(time: number): void {
    this.spawnTimer -= this.game.loop.delta;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval();
      this.spawnDog();
    }
    if (this.level >= 3) {
      this.ninjaSpawnTimer -= this.game.loop.delta;
      if (this.ninjaSpawnTimer <= 0) {
        this.ninjaSpawnTimer = this.ninjaSpawnInterval();
        this.spawnNinja();
      }
    }
  }

  private spawnDog(): void {
    const idx = Phaser.Math.Between(0, PLATFORM_COUNT - 2);
    const plat = this.platformBodies[idx];
    const d = this.dogs.create(
      plat.x,
      plat.y - 12 - DOG_TEX_HALF_H,
      "dog"
    ) as Phaser.Physics.Arcade.Sprite;
    d.setData("plat", idx);
    d.setData("dir", Math.random() < 0.5 ? -1 : 1);
    d.setData("pauseMs", Phaser.Math.Between(420, 980));
    d.setData("moveMs", Phaser.Math.Between(900, 1700));
    d.setBounce(0);
    d.setCollideWorldBounds(true);
    d.setTexture("dog");
    this.showDogSpeechBubble(
      d,
      Phaser.Utils.Array.GetRandom(DOG_QUOTES) ?? "Woof!"
    );
  }

  private spawnNinja(): void {
    const behind = this.player.flipX ? 120 : -120;
    const d = this.ninjaDogs.create(
      this.player.x + behind,
      this.player.y,
      "ninja_dog"
    ) as Phaser.Physics.Arcade.Sprite;
    d.setData("cd", 0);
    this.showDogSpeechBubble(
      d,
      Phaser.Utils.Array.GetRandom(DOG_QUOTES) ?? "Woof!"
    );
  }

  private updateDogAi(): void {
    const patrol = PLATFORM_WIDTH / 2 - 50;
    const delta = this.game.loop.delta;
    for (const d of this.dogs.getChildren()) {
      const dog = d as Phaser.Physics.Arcade.Sprite;
      const idx = dog.getData("plat") as number;
      const plat = this.platformBodies[idx];
      if (!plat) continue;
      let pauseMs = (dog.getData("pauseMs") as number) ?? 0;
      let moveMs = (dog.getData("moveMs") as number) ?? 0;
      if (pauseMs > 0) {
        pauseMs -= delta;
        dog.setData("pauseMs", pauseMs);
        dog.setVelocityX(0);
        dog.anims.stop();
        dog.setTexture("dog");
        if (pauseMs <= 0) {
          dog.setData("moveMs", Phaser.Math.Between(1200, 2200));
        }
        continue;
      }

      let dir = dog.getData("dir") as number;
      const left = plat.x - patrol;
      const right = plat.x + patrol;
      if (dog.x < left) dir = 1;
      if (dog.x > right) dir = -1;
      moveMs -= delta;
      if (moveMs <= 0) {
        dog.setData("moveMs", 0);
        dog.setData("pauseMs", Phaser.Math.Between(600, 1300));
        dog.setVelocityX(0);
        dog.anims.stop();
        dog.setTexture("dog");
        continue;
      }
      dog.setData("dir", dir);
      dog.setData("moveMs", moveMs);
      dog.setFlipX(dir < 0);
      dog.setVelocityX(dir * 90);
      const cur = dog.anims.currentAnim?.key;
      if (cur !== "dog_walk") {
        dog.play("dog_walk", true);
      }
    }
  }

  private updateNinjaAi(_time: number): void {
    for (const n of this.ninjaDogs.getChildren()) {
      const dog = n as Phaser.Physics.Arcade.Sprite;
      let cd = dog.getData("cd") as number;
      cd -= this.game.loop.delta;
      if (cd <= 0) {
        cd = 1200;
        const dagger = this.daggers.create(dog.x, dog.y, "dagger") as Phaser.Physics.Arcade.Sprite;
        const toward = Math.sign(this.player.x - dog.x) || 1;
        dagger.setVelocityX(toward * 380);
        dagger.setVelocityY(Phaser.Math.Between(-40, 40));
        const db = dagger.body as Phaser.Physics.Arcade.Body;
        db.allowGravity = false;
      }
      dog.setData("cd", cd);
    }
  }

  private cleanupProjectiles(): void {
    for (const c of this.cucumbers.getChildren()) {
      const s = c as Phaser.Physics.Arcade.Sprite;
      if (
        s.y > this.worldH + 50 ||
        s.x < -50 ||
        s.x > this.worldW + 50
      ) {
        s.destroy();
      }
    }
    for (const d of this.daggers.getChildren()) {
      const s = d as Phaser.Physics.Arcade.Sprite;
      if (s.x < -80 || s.x > this.worldW + 80) s.destroy();
    }
  }
}
