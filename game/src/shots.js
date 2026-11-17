// The screenshot scenes behind ?shot=start|play|surge|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot, so
// the frame is what a short game really looks like and the same seed always gives the same
// frame. The autopilot is also the title screen's demo pilot.
import { EMBER, FIELD, SHIP, STAR, STEP } from './config.js';
import { EVENT_OVER, EVENT_PICKUP } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const SURGE_SECONDS = 45;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the nearest shard, away from the nearest rock, and never into the star.
 * Shards falling close to the star are ignored: they are about to burn, and chasing
 * them is how pilots fly into the heat. */
export function autopilot(state, reckless = false) {
  const ship = state.ship;
  let x = 0;
  let y = 0;
  // Nearest shard outside the star's danger zone pulls.
  let shard = null;
  let shardDist = Infinity;
  for (const item of state.shards) {
    const dStar = Math.hypot(item.x - STAR.x, item.y - STAR.y);
    if (dStar < (reckless ? 120 : 180)) continue;
    const d = Math.hypot(item.x - ship.x, item.y - ship.y);
    if (d < shardDist) {
      shardDist = d;
      shard = item;
    }
  }
  if (shard) {
    x += (shard.x - ship.x) / shardDist;
    y += (shard.y - ship.y) / shardDist;
  }
  // The star pushes away when close, harder the closer the ship gets; brake too, so
  // momentum toward the star is killed before the heat takes a life.
  const dStar = Math.hypot(ship.x - STAR.x, ship.y - STAR.y);
  const keepOut = reckless ? 130 : 230;
  if (dStar < keepOut) {
    const push = (reckless ? 0.9 : 2.4) * (1 - dStar / keepOut);
    x += ((ship.x - STAR.x) / dStar) * push;
    y += ((ship.y - STAR.y) / dStar) * push;
  }
  // Rocks and embers push away when close; the reckless pilot notices them too late.
  const dangerRadius = reckless ? 70 : 145;
  for (const rock of state.asteroids) {
    const dx = ship.x - rock.x;
    const dy = ship.y - rock.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < dangerRadius + rock.radius) {
      const push = 2.2 * (1 - d / (dangerRadius + rock.radius));
      x += (dx / d) * push;
      y += (dy / d) * push;
    }
  }
  for (const ember of state.embers) {
    const dx = ship.x - ember.x;
    const dy = ship.y - ember.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < dangerRadius) {
      const push = 1.6 * (1 - d / dangerRadius);
      x += (dx / d) * push;
      y += (dy / d) * push;
    }
  }
  // Keep inside the field.
  const margin = 90;
  if (ship.x < margin) x += 1.2;
  if (ship.x > FIELD.width - margin) x -= 1.2;
  if (ship.y < margin) y += 1.2;
  if (ship.y > FIELD.height - margin) y -= 1.2;
  const length = Math.hypot(x, y);
  if (length < 0.05) return null;
  return { x: x / length, y: y / length };
}

/**
 * Set `world` to the named scene (start, play, surge or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'surge' && name !== 'end') {
    // Title: let the demo pilot drift for a few seconds so the backdrop is alive.
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, autopilot(world.state), true);
    return { screen: SCREEN_TITLE, best: 1240, score: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'surge' ? SURGE_SECONDS : PLAY_SECONDS;
  const reckless = name === 'end';
  let events = 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    events = world.step(STEP, autopilot(world.state, reckless), false);
    if (events & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return {
    screen: over ? SCREEN_OVER : SCREEN_PLAY,
    best: Math.max(1240, world.state.score),
    score: world.state.score,
    pickedUp: (events & EVENT_PICKUP) !== 0,
  };
}
