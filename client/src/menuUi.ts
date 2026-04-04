import Phaser from "phaser";

export type MenuButtonStyle = {
  fontPx: number;
  textColor: string;
  bg: string;
  bgHover: string;
  paddingY?: number;
};

/**
 * Equal-width, centered menu row for touch-friendly hit targets.
 */
export function addFixedWidthMenuButton(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  width: number,
  label: string,
  style: MenuButtonStyle
): Phaser.GameObjects.Text {
  const py = style.paddingY ?? Math.max(10, Math.round(style.fontPx * 0.45));
  const t = scene.add
    .text(cx, cy, label, {
      fontFamily: "sans-serif",
      fontSize: `${style.fontPx}px`,
      color: style.textColor,
      backgroundColor: style.bg,
      fixedWidth: width,
      align: "center",
      padding: { x: 8, y: py },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setScrollFactor(0)
    .setDepth(3000);
  t.on("pointerover", () => t.setStyle({ backgroundColor: style.bgHover }));
  t.on("pointerout", () => t.setStyle({ backgroundColor: style.bg }));
  return t;
}

export function menuButtonWidth(scene: Phaser.Scene): number {
  const w = scene.scale.width;
  return Math.min(w - 32, 320);
}
