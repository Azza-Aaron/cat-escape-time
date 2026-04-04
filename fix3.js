const fs = require('fs');
let code = fs.readFileSync('client/src/scenes/PlayScene.ts', 'utf8');

// 1. Remove createTouchControls references and definitions
code = code.replace(/this\.createTouchControls\(\);/g, '');
code = code.replace(/this\.destroyTouchControls\(\);/g, '');

// 2. Erase the updateHud method and format events correctly.
// we will just replace all calls to this.updateHud();
code = code.replace(/this\.updateHud\(\);/g, 'this.events.emit("updateScore", this.score);\n    this.events.emit("updateLives", this.lives);\n    this.events.emit("updateLevel", this.level);\n    this.events.emit("updateTimer", this.timeLeft);');

// 3. Remove layoutHud
code = code.replace(/this\.layoutHud\(\);/g, '');

// 4. Force sprinting always and fix touchSprintDown usages
code = code.replace(/const sprint = this\.touchSprintDown \|\| this\.keyDown\(this\.keyShift\);/g, 'const sprint = true;');
code = code.replace(/const sprint = this\.touchSprintDown \? true : false;/g, 'const sprint = true;');

// 5. Update updatePlayerMovement sprint arguments
code = code.replace(/const accel = sprint \? 2600 : 1700;/g, 'const accel = 2600;');

// 6. Make Ladders invisible:
if (!code.includes('private refreshLadderVisibility()')) {
  code = code.replace(
    /private buildLevel\(\): void \{/,
    `private refreshLadderVisibility(): void {
    for (const seg of this.ladderZones) {
      if (seg.gfx && this.goldOnPlatform) {
        seg.gfx.setAlpha(this.goldOnPlatform[seg.fromPlat] ? 1 : 0);
      }
    }
  }

  private buildLevel(): void {`
  );
}

// Ensure ladders update globally when building
code = code.replace(
  /this\.goldOnPlatform\[platIdx\] = true;/,
  'this.goldOnPlatform[platIdx] = true;\n    this.refreshLadderVisibility();'
);

// We need to also hook this up to initial build. Find the end of buildLevel() or just after platforms.
code = code.replace(
    /this\.buildLevel\(\);/,
    'this.buildLevel();\n    this.refreshLadderVisibility();'
);

fs.writeFileSync('client/src/scenes/PlayScene.ts', code, 'utf8');
console.log('Fixed!');
