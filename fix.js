const fs = require('fs');
let code = fs.readFileSync('client/src/scenes/PlayScene.ts', 'utf8');

// 1. Zoom const
code = code.replace(
  'const PLATFORM_COUNT = 6;',
  'const MOBILE_CAMERA_ZOOM = 3;\nexport const PLATFORM_COUNT = 6;'
);

// Add missing imports
code = code.replace(
  'useMobileControls,\n} from "../mobileLayout";',
  'positionScreenSpaceContainer,\n  useMobileControls,\n} from "../mobileLayout";'
);

// 2. Remove HUD fields
code = code.replace(/  private hudTimer!:.*?;\n/g, '');
code = code.replace(/  private hudLevel!:.*?;\n/g, '');
code = code.replace(/  private hudLives!:.*?;\n/g, '');
code = code.replace(/  private hudScore!:.*?;\n/g, '');
code = code.replace(/  private hudBottomPanel!:.*?;\n/g, '');
code = code.replace(/  private hudTopPanel!:.*?;\n/g, '');

// 3. Remove touch queue fields
code = code.replace(/  private touchZones[\s\S]*?private touchJumpQueued = false;/m, `  private touchLeftDown = false;
  private touchRightDown = false;
  private touchUpDown = false;
  private touchDownDown = false;
  private touchSprintDown = false;
  private touchJumpDown = false;
  private touchUpPrevJump = false;
  private stickUpJumpEdge = false;
  private jumpPressConsumed = false;`);

// 4. Update shutdown event
code = code.replace(
  /this\.scale\.off\("resize", this\.onPlayResize, this\);\n\s*this\.destroyTouchControls\(\);/,
  `this.events.off("touchStart");
      this.events.off("toggleRun");
      this.events.off("touchJump");`
);

// 5. Remove onPlayResize bind
code = code.replace(/    this\.scale\.on\("resize", this\.onPlayResize, this\);\n/, '');

// 6. Fix timer Event callback to emit event instead of updateHud
code = code.replace(
  `        this.updateHud();
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.updateHud();`,
  `        this.events.emit("updateTimer", this.timeLeft);
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.events.emit("updateTimer", 0);`
);

// 7. Remove touch controls + HUD creation
code = code.replace(/    this\.hudBottomPanel = this\.add[\s\S]*?this\.updateHud\(\);\n/m, `    this.scene.launch("UiScene", {
      level: this.level,
      score: this.score,
      lives: this.lives,
      timeLeft: this.timeLeft,
      useMobileTouch: this.useMobileTouch
    });

    this.events.on("touchStart", (p: { id: number, x: number, y: number, centerX: number, centerY: number }) => {
      this.stickPointerId = p.id;
      this.stickCenterX = p.centerX;
      this.stickCenterY = p.centerY;
      this.updateStickVectorFromData(p.x, p.y);
    });
    this.events.on("toggleRun", () => {
      this.touchSprintDown = !this.touchSprintDown;
      this.events.emit("syncMobileRun", this.touchSprintDown);
    });
    this.events.on("touchJump", () => {
      this.touchJumpDown = true;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) {
        this.updateStickVectorFromData(p.x, p.y);
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickPointerId) {
        this.stickPointerId = null;
        this.clearStickDirections();
      }
    });\n`);

code = code.replace(/    if \(this\.useMobileTouch\) \{\n\s*this\.createTouchControls\(\);\n\s*\}\n/m, '');
code = code.replace(/    this\.cameras\.main\.startFollow\(this\.player, true, 0\.12, 0\.12\);\n/, '');

// 8. Replace applyPlayCamera
code = code.replace(
  /  \/\*\* Closer follow on mobile only[\s\S]*?    \}\n  \}/m,
  `  private updateStickVectorFromData(px: number, py: number): void {
    if (this.qteActive) return;
    const dx = px - this.stickCenterX;
    const dy = py - this.stickCenterY;
    const d = this.stickDead;
    this.touchLeftDown = dx < -d;
    this.touchRightDown = dx > d;
    this.touchUpDown = dy < -d;
    this.touchDownDown = dy > d;
  }

  private applyPlayCamera(): void {
    const cam = this.cameras.main;
    if (!this.player) return;
    if (this.useMobileTouch) {
      const zoom = window.innerWidth < 600 ? MOBILE_CAMERA_ZOOM : 2.2;
      cam.setZoom(zoom);
      cam.setDeadzone(0, 0);
      cam.startFollow(this.player, true, 1, 0.14, 0, 40);
    } else {
      cam.setZoom(1);
      cam.setDeadzone(120, 80);
      cam.startFollow(this.player, true, 0.12, 0.12, 0, 0);
    }
  }`
);

// 9. Remove layoutHud and onPlayResize
code = code.replace(/  private onPlayResize = \(\): void => \{[\s\S]*?^  private upPressed\(\): boolean/m, '  private upPressed(): boolean');

// 10. Fix upPressed and jump
code = code.replace('      this.touchUpDown ||', '      this.touchJumpDown ||\n      this.touchUpDown ||');

code = code.replace(
  /  private consumeJumpPress\(\): boolean \{[\s\S]*?touchJumpQueued = false;\n    return keyboardJump \|\| touchJump;\n  \}/m,
  `  private consumeJumpPress(): boolean {
    if (this.jumpPressConsumed) return false;

    const keyboardJump =
      this.justPressed(this.keySpace) ||
      this.justPressed(this.keyW) ||
      this.justPressed(this.cursors?.up);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    let stickJump = false;
    if (this.useMobileTouch && this.stickUpJumpEdge) {
      if (this.onLadder && this.touchSprintDown) {
        stickJump = true;
      } else if (!this.onLadder && grounded) {
        stickJump = true;
      }
    }

    const result = keyboardJump || stickJump || this.touchJumpDown;
    if (result) {
      this.jumpPressConsumed = true;
      this.touchJumpDown = false;
    }
    return result;
  }`
);

// 11. Remove old touch controls methods
code = code.replace(/  private destroyTouchControls\(\): void \{[\s\S]*?^  private clearMobileQteChoices\(\): void/m, `  private clearStickDirections(): void {
    this.touchLeftDown = false;
    this.touchRightDown = false;
    this.touchUpDown = false;
    this.touchDownDown = false;
    this.touchUpPrevJump = false;
  }

  private clearMobileQteChoices(): void`);

// 12. Replace updateHud call
code = code.replace(
  /  private updateHud\(\): void \{[\s\S]*?this\.hudTimer\.setText\(`Time: \$\{this\.timeLeft\}s`\);\n  \}/m,
  `  private updateStickJumpState(): void {
    if (!this.useMobileTouch) return;
    const isUp = this.touchUpDown;
    this.stickUpJumpEdge = isUp && !this.touchUpPrevJump;
    this.touchUpPrevJump = isUp;
  }`
);

code = code.replace(/this\.updateHud\(\);\n/g, '');

// 13. Fix QTE mobile scale
code = code.replace(
  /    this\.qteContainer = this\.add\.container\(this\.scale\.width \/ 2, this\.scale\.height \/ 2\);\n    this\.qteContainer\.setScrollFactor\(0\);\n    this\.qteContainer\.setDepth\(2000\);/m,
  `    this.qteContainer = this.add.container(0, 0);`
);

code = code.replace(
  /    this\.refreshQteDisplay\(\);\n    this\.ensureMobileQteChoices\(\);\n  \}/m,
  `    positionScreenSpaceContainer(this, this.qteContainer, { depth: 2000 });
    this.refreshQteDisplay();
    this.ensureMobileQteChoices();
  }`
);

code = code.replace(/    this\.stickPointerId = null;\n    this\.clearStickDirections\(\);\n    this\.destroyTouchControls\(\);/, '    this.clearStickDirections();');

code = code.replace(/    if \(this\.useMobileTouch && \(success \|\| this\.lives > 0\)\) \{\n      this\.createTouchControls\(\);\n    \}/, '');

// 14. Update update() events
code = code.replace(/    this\.updateLastSafePlatform\(\);\n/, `    this.events.emit("updatePlatform", this.platformIndexForY(this.player.y) + 1);\n    this.updateStickJumpState();\n    this.updateLastSafePlatform();\n`);

// 15. Update life/score emissions where missing
code = code.replace(/this\.score \+= 50;/g, 'this.score += 50; this.events.emit("updateScore", this.score);');
code = code.replace(/this\.score \+= 25;/g, 'this.score += 25; this.events.emit("updateScore", this.score);');
code = code.replace(/this\.lives \+= 1;/g, 'this.lives += 1; this.events.emit("updateLives", this.lives);');

code = code.replace(/this\.score \+= 30;/g, 'this.score += 30; this.events.emit("updateScore", this.score);');
code = code.replace(/this\.score \+= 45;/g, 'this.score += 45; this.events.emit("updateScore", this.score);');

code = code.replace(/this\.lives -= 1;/g, 'this.lives -= 1; this.events.emit("updateLives", this.lives);');

code = code.replace(/this\.score \+= 500 \+ Math\.floor\(this\.timeLeft\) \* 2;/g, 'this.score += 500 + Math.floor(this.timeLeft) * 2;\n    this.events.emit("updateLevel", this.level + 1);\n    this.events.emit("updateScore", this.score);\n    this.events.emit("updateLives", this.lives + 1);\n    this.events.emit("updatePlatform", 1);');

// Stop UiScene on game over
code = code.replace(
  /    this\.scene\.start\("MenuScene"\);\n/m,
  `    this.scene.stop("UiScene");
    this.scene.start("ScoreboardScene", { score: this.score, reason });\n`
);

// One-way platform collisions
code = code.replace(
  /this\.physics\.add\.collider\(this\.pickups, this\.platforms\);/,
  `this.physics.add.collider(
      this.pickups,
      this.platforms,
      undefined,
      this.pickupPlatformProcessCallback,
      this
    );`
);

code = code.replace(
  /  private maybeAnnounceNewPlatform/m,
  `  private processPickupOnPlatform(
    pickup: Phaser.Physics.Arcade.Sprite,
    pl: Phaser.Physics.Arcade.Sprite
  ): boolean {
    const body = pickup.body as Phaser.Physics.Arcade.Body;
    const pb = pl.body as Phaser.Physics.Arcade.StaticBody;
    if (!body || !pb) return false;
    const overlapX = Math.min(body.right, pb.right) - Math.max(body.left, pb.left);
    if (overlapX <= 2) return false;
    if (body.velocity.y < -12) return false;
    const prevBottom = body.prev.y + body.height;
    const comingFromAbove = prevBottom <= pb.top + 12;
    if (!comingFromAbove) return false;
    return body.bottom >= pb.top - 12 && body.bottom <= pb.top + 56;
  }

  private pickupPlatformProcessCallback = (o1: object, o2: object): boolean => {
    const s1 = o1 as Phaser.Physics.Arcade.Sprite;
    const s2 = o2 as Phaser.Physics.Arcade.Sprite;
    const k1 = s1.texture?.key ?? "";
    const k2 = s2.texture?.key ?? "";
    if (k1 === "pickup_gold" || k1 === "pickup_heart") {
      return this.processPickupOnPlatform(s1, s2);
    }
    if (k2 === "pickup_gold" || k2 === "pickup_heart") {
      return this.processPickupOnPlatform(s2, s1);
    }
    return false;
  };

  private maybeAnnounceNewPlatform`
);

fs.writeFileSync('client/src/scenes/PlayScene.ts.patched', code);
