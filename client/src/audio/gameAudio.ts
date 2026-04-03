import Phaser from "phaser";
import { isMusicEnabled, isSfxEnabled } from "./audioSettings";
import { PHASER_EXAMPLES_AUDIO } from "./audioUrls";

const B = PHASER_EXAMPLES_AUDIO;

/** Call from BootScene.preload */
export function preloadGameAudio(load: Phaser.Loader.LoaderPlugin): void {
  load.audio("bgm_menu", `${B}/goaman_intro.mp3`);
  const levelTracks = [
    `${B}/bodenstaendig_2000_in_rock_4bit.mp3`,
    `${B}/jungle.mp3`,
    `${B}/CatAstroPhi_shmup_normal.mp3`,
    `${B}/neriakX_-_Enigma_Gun_Extended_Mix.mp3`,
  ];
  for (let i = 0; i < levelTracks.length; i++) {
    load.audio(`bgm_level_${i}`, levelTracks[i]!);
  }

  load.audio("sfx_jump", `${B}/SoundEffects/blaster.mp3`);
  load.audio("sfx_pickup", `${B}/SoundEffects/p-ping.mp3`);
  load.audio("sfx_hurt", `${B}/SoundEffects/explosion.mp3`);
  load.audio("sfx_meow", `${B}/SoundEffects/meow1.mp3`);
  load.audio("sfx_level", `${B}/SoundEffects/menu_select.mp3`);
  load.audio("sfx_stomp", `${B}/SoundEffects/squit.mp3`);
  load.audio("sfx_qte", `${B}/SoundEffects/menu_switch.mp3`);
  load.audio("sfx_fail", `${B}/SoundEffects/numkey_wrong.wav`);
  load.audio("sfx_purr", `${B}/SoundEffects/meow2.mp3`);
  load.audio("sfx_kie_human", `${B}/SoundEffects/door_open.wav`);
  load.audio("sfx_kie_demon", `${B}/SoundEffects/lazer.wav`);
}

let menuMusic: Phaser.Sound.BaseSound | null = null;
let levelMusic: Phaser.Sound.BaseSound | null = null;

export function stopMenuMusic(): void {
  if (menuMusic) {
    menuMusic.stop();
    menuMusic.destroy();
    menuMusic = null;
  }
}

export function playMenuMusic(scene: Phaser.Scene): void {
  stopMenuMusic();
  if (!isMusicEnabled()) return;
  if (!scene.cache.audio.exists("bgm_menu")) return;
  menuMusic = scene.sound.add("bgm_menu", { loop: true, volume: 0.38 });
  menuMusic.play();
}

export function stopLevelMusic(): void {
  if (levelMusic) {
    levelMusic.stop();
    levelMusic.destroy();
    levelMusic = null;
  }
}

/** Random track each call; `level` reserved for future per-level picks. */
export function playLevelMusic(scene: Phaser.Scene, _level: number): void {
  stopLevelMusic();
  if (!isMusicEnabled()) return;
  const i = Phaser.Math.Between(0, 3);
  const key = `bgm_level_${i}`;
  if (!scene.cache.audio.exists(key)) return;
  levelMusic = scene.sound.add(key, { loop: true, volume: 0.32 });
  levelMusic.play();
}

export function playSfx(
  scene: Phaser.Scene,
  key:
    | "sfx_jump"
    | "sfx_pickup"
    | "sfx_hurt"
    | "sfx_meow"
    | "sfx_level"
    | "sfx_stomp"
    | "sfx_qte"
    | "sfx_fail"
    | "sfx_purr"
    | "sfx_kie_human"
    | "sfx_kie_demon",
  volume = 0.55
): void {
  if (!isSfxEnabled()) return;
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume });
}
