import Phaser from "phaser";

/** Viewports below this width get larger UI (game + menus). */
export const MOBILE_LAYOUT_MAX_WIDTH = 900;

/**
 * Reliable mobile/touch UI mode: do not rely on Phaser's `device.input.touch` alone.
 */
export function useMobileControls(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator.maxTouchPoints ?? 0) > 0) return true;
  if ("ontouchstart" in window) return true;
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Extra scale for screen-space HUD/menus on small displays (game size stays 960×640).
 */
export function getMobileUiScale(scene: Phaser.Scene): number {
  const w = scene.scale.displaySize.width;
  if (w < 420) return 1.55;
  if (w < 560) return 1.4;
  if (w < 720) return 1.25;
  if (w < MOBILE_LAYOUT_MAX_WIDTH) return 1.12;
  return 1;
}
