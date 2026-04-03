const K_MUSIC = "ce_music";
const K_SFX = "ce_sfx";

export function isMusicEnabled(): boolean {
  return localStorage.getItem(K_MUSIC) !== "0";
}

export function isSfxEnabled(): boolean {
  return localStorage.getItem(K_SFX) !== "0";
}

export function setMusicEnabled(on: boolean): void {
  localStorage.setItem(K_MUSIC, on ? "1" : "0");
}

export function setSfxEnabled(on: boolean): void {
  localStorage.setItem(K_SFX, on ? "1" : "0");
}
