// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const STAR = {
  x: FIELD.width / 2,
  y: FIELD.height / 2,
  radius: 62,
  /** Gravity pull, in px/s^2 at a reference distance; falls off with distance. */
  gravity: 26000,
  /** Closest anything may approach before the pull is clamped (avoids a singularity). */
  gravityFloor: 90,
  /** How close the ship may fly before the star's heat takes a life. */
  heatRadius: 78,
};

export const SHIP = {
  radius: 13,
  thrust: 950,
  maxSpeed: 540,
  /** Velocity retained per second with no thrust (exponential drag). */
  drag: 0.55,
  invulnerable: 2,
};

export const SHARD = {
  radius: 10,
  points: 10,
  /** Drift speed toward the star when spawned. */
  drift: 46,
  /** Seconds between spawns at wave 1; shortens a little each wave. */
  interval: 1.15,
  intervalPerWave: 0.06,
  minInterval: 0.55,
};

export const ASTEROID = {
  minRadius: 15,
  maxRadius: 30,
  speed: 70,
  speedPerWave: 9,
  /** Seconds between spawns at wave 1; shortens each wave. */
  interval: 2.6,
  intervalPerWave: 0.16,
  minInterval: 0.75,
};

export const EMBER = {
  radius: 7,
  speed: 190,
  count: 14,
  countPerWave: 2,
  maxCount: 26,
};

/** Seconds of play per wave, and the last wave (spawning stops getting harder there). */
export const WAVE = { seconds: 25, max: 12, flareFrom: 2, flareInterval: 19 };

export const COMBO = { window: 4, max: 8 };

export const LIVES = 3;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starfall.best';

export const PALETTE = {
  backdrop: '#070a18',
  deep: '#0d1230',
  starCore: '#fff3c4',
  starMid: '#ffb347',
  starEdge: '#ff5e3a',
  ship: '#5ef2e0',
  shipCore: '#eafffb',
  shard: '#ffd166',
  shardCore: '#fff7d6',
  asteroid: '#8d7d8a',
  asteroidDark: '#5c4f5e',
  ember: '#ff7a3c',
  text: '#f4f6ff',
  muted: '#9aa3c7',
  panel: 'rgba(13, 18, 48, 0.82)',
  danger: '#ff5e6c',
  gold: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
