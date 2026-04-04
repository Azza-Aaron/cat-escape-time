import Phaser from "phaser";

/** Viewports below this width get larger UI (game + menus). */
export const MOBILE_LAYOUT_MAX_WIDTH = 900;

/**
 * True when we should show touch-first UI (virtual stick, centered HUD).
 * Intentionally false for most laptops with touchscreens: they report maxTouchPoints but
 * use a fine pointer with hover, so keyboard + mouse layout should stay.
 */
export function useMobileControls(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Mouse / trackpad primary: keep keyboard + corner HUD even in a narrow window.
    if (window.matchMedia("(pointer: fine)").matches) return false;
  } catch {
    /* ignore */
  }
  try {
    const mm = window.matchMedia.bind(window);
    if (mm("(pointer: coarse)").matches && mm("(hover: none)").matches) return true;
  } catch {
    /* ignore */
  }
  const w = window.innerWidth;
  // If it's a very narrow view, we should use the mobile layout, even if touch points are 0 (e.g. testing in DevTools).
  if (w < 600) return true;
  return false;
}

export type DeviceType = "mobile" | "tablet" | "desktop";

export function getDeviceType(): DeviceType {
  const w = window.innerWidth;
  if (useMobileControls()) return "mobile";
  if (w < MOBILE_LAYOUT_MAX_WIDTH) return "tablet";
  return "desktop";
}

/**
 * Extra scale for screen-space HUD/menus on small displays (game size stays 960×640).
 * Uses the visible parent (#game) width — not {@link Phaser.Scale.ScaleManager#displaySize},
 * which under FIT/ENVELOP is the canvas CSS size and can be much larger than the viewport.
 */
export function getMobileUiScale(scene: Phaser.Scene): number {
  const ps = scene.scale.parentSize;
  const w = ps.width > 0 ? ps.width : scene.scale.width;
  if (w < 420) return 1.6;
  if (w < 560) return 1.45;
  if (w < 720) return 1.3;
  if (w < 820) return 1.15;
  if (w < MOBILE_LAYOUT_MAX_WIDTH) return 1.1;
  return 1;
}

export function getVisibleBounds(scene: Phaser.Scene): { left: number; right: number; top: number; bottom: number; width: number; height: number } {
  const w = scene.scale.width;
  const h = scene.scale.height;
  if (scene.scale.scaleMode === Phaser.Scale.ENVELOP || scene.scale.scaleMode === Phaser.Scale.FIT) {
    const scaleX = scene.scale.displayScale.x;
    const scaleY = scene.scale.displayScale.y;
    const parentW = scene.scale.parentSize.width;
    const parentH = scene.scale.parentSize.height;
    if (scaleX > 0 && scaleY > 0 && parentW > 0 && parentH > 0) {
      const visW = parentW / scaleX;
      const visH = parentH / scaleY;
      const left = (w - visW) / 2;
      const top = (h - visH) / 2;
      return { left, right: left + visW, top, bottom: top + visH, width: visW, height: visH };
    }
  }
  return { left: 0, right: w, top: 0, bottom: h, width: w, height: h };
}

/**
 * Centers a menu/modal container in **screen space** so it stays correct when the play camera
 * is zoomed (vertical slice) or scrolling. Children use local coords from this center.
 * Prefer sizing text/buttons with {@link getMobileUiScale} instead of scaling the whole container.
 */
export function positionScreenSpaceContainer(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  options?: { depth?: number; scale?: number }
): void {
  const depth = options?.depth ?? 3000;
  // World / camera space uses game size (scale.width × scale.height), not canvas CSS pixels.
  const viewW = scene.scale.width;
  const viewH = scene.scale.height;
  container.setScrollFactor(0);
  container.setDepth(depth);

  const cam = scene.cameras.main;
  const z = cam.zoom;
  const cx = cam.centerX;
  const cy = cam.centerY;
  
  const targetX = viewW / 2;
  const targetY = viewH / 2;
  
  container.setPosition(cx + (targetX - cx) / z, cy + (targetY - cy) / z);
  
  if (options?.scale !== undefined) {
    container.setScale(options.scale / z);
  } else {
    container.setScale(1 / z);
  }
}

/**
 * True when we should scale the canvas with ENVELOP (fill viewport; portrait phones crop sides).
 * Desktop keeps FIT. Real mobile uses ENVELOP so the game is not letterboxed with empty bars.
 */
export function shouldEnvelopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return useMobileControls();
}

/** Call from BootScene (and optionally on resize) so phones get full-height canvas; desktop stays FIT. */
export function applyViewportScaleMode(scene: Phaser.Scene): void {
  const sm = scene.scale;
  const nextMode = shouldEnvelopViewport()
    ? Phaser.Scale.ENVELOP
    : Phaser.Scale.FIT;
  if (sm.scaleMode === nextMode) return;
  sm.scaleMode = nextMode;
  sm.refresh();
}
