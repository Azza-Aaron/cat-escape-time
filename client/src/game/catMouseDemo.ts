import Phaser from "phaser";

/**
 * Looped sitting cat + mouse swipe (textures & anims from BootScene).
 * Call after textures exist. Paw extends only after the mouse tween finishes (in front of cat).
 */
export function startCatMouseDemo(
  scene: Phaser.Scene,
  anchorX: number,
  anchorY: number,
  catScale = 1.55,
  firstSwipeDelayMs = 500
): void {
  const cat = scene.add.sprite(anchorX, anchorY, "cat_boot_sit_0");
  cat.setScale(catScale);
  cat.setDepth(5);
  cat.play({ key: "cat_boot_wag", repeat: -1 });

  const mouse = scene.add.sprite(anchorX + 120, anchorY + 14, "mouse");
  mouse.setScale(1.35 * catScale * 0.88);
  mouse.setDepth(6);
  mouse.setVisible(false);

  const mouseRestX = anchorX + 44;
  const mouseStartX = anchorX + 118;

  const runSwipe = () => {
    if (!cat.active) return;
    cat.anims.pause();
    mouse.setPosition(mouseStartX, anchorY + 14);
    mouse.setAlpha(0);
    mouse.setVisible(true);
    cat.setTexture("cat_boot_look_0");

    scene.tweens.add({
      targets: mouse,
      alpha: 1,
      x: mouseRestX,
      duration: 520,
      ease: "Sine.easeOut",
      onComplete: () => {
        cat.setTexture("cat_boot_look_1");
        scene.time.delayedCall(100, () => {
          cat.setTexture("cat_boot_swipe");
          scene.time.delayedCall(300, () => {
            scene.tweens.add({
              targets: mouse,
              alpha: 0,
              x: anchorX + 28,
              y: anchorY + 6,
              duration: 220,
              ease: "Sine.easeIn",
              onComplete: () => {
                mouse.setVisible(false);
                cat.setTexture("cat_boot_sit_0");
                cat.play({ key: "cat_boot_wag", repeat: -1 });
                scene.time.delayedCall(950, runSwipe);
              },
            });
          });
        });
      },
    });
  };

  scene.time.delayedCall(firstSwipeDelayMs, runSwipe);
}
