// The simulation: one ship, a hungry star, falling shards, drifting asteroids and solar
// flares. Everything moves in fixed 1/60 s steps; the renderer only paints this state.
// Events are a bitmask the loop reads each step for sound and announcements.
import { ASTEROID, COMBO, EMBER, FIELD, LIVES, SHARD, SHIP, STAR, WAVE } from './config.js';
import { createParticles } from './particles.js';

export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE = 8;
export const EVENT_FLARE = 16;
export const EVENT_BURN = 32;

const TAU = Math.PI * 2;

function edgePoint(random) {
  const side = random.int(0, 4);
  const margin = 24;
  if (side === 0) return { x: random.range(margin, FIELD.width - margin), y: margin };
  if (side === 1) return { x: random.range(margin, FIELD.width - margin), y: FIELD.height - margin };
  if (side === 2) return { x: margin, y: random.range(margin, FIELD.height - margin) };
  return { x: FIELD.width - margin, y: random.range(margin, FIELD.height - margin) };
}

export function createWorld(random) {
  const particles = createParticles();
  const state = {
    time: 0,
    score: 0,
    lives: LIVES,
    wave: 1,
    waveTime: 0,
    shardsCollected: 0,
    maxCombo: 0,
    combo: 0,
    comboTimer: 0,
    ship: { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 0, thrusting: false, trail: [] },
    shards: [],
    asteroids: [],
    embers: [],
    flare: { phase: 'idle', timer: 0 },
    banner: { text: '', sub: '', timer: 0 },
    starPulse: 0,
  };
  let shardTimer = 0.4;
  let asteroidTimer = 2.8;
  // The renderer reads particles (and shake) off the state, so one object is the whole scene.
  state.particles = particles;

  function placeShip() {
    const angle = -Math.PI / 2;
    const orbit = 280;
    state.ship.x = STAR.x + Math.cos(angle) * orbit;
    state.ship.y = STAR.y + Math.sin(angle) * orbit;
    // A tangential kick, so the ship starts in a loose orbit instead of falling straight in.
    const speed = Math.sqrt(STAR.gravity / orbit) * 0.82;
    state.ship.vx = -Math.sin(angle) * speed;
    state.ship.vy = Math.cos(angle) * speed;
    state.ship.angle = angle + Math.PI / 2;
    state.ship.trail.length = 0;
  }

  function spawnShard() {
    const point = edgePoint(random);
    const dx = STAR.x - point.x;
    const dy = STAR.y - point.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = SHARD.drift + state.wave * 2;
    const tangent = random.range(-0.35, 0.35);
    state.shards.push({
      x: point.x,
      y: point.y,
      vx: (dx / dist) * speed + (-dy / dist) * tangent * speed,
      vy: (dy / dist) * speed + (dx / dist) * tangent * speed,
      spin: random.range(-1.6, 1.6),
      phase: random.range(0, TAU),
    });
  }

  function spawnAsteroid() {
    const point = edgePoint(random);
    const target = { x: random.range(300, FIELD.width - 300), y: random.range(180, FIELD.height - 180) };
    const dx = target.x - point.x;
    const dy = target.y - point.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = ASTEROID.speed + (state.wave - 1) * ASTEROID.speedPerWave;
    const verts = [];
    const count = 9;
    for (let i = 0; i < count; i += 1) verts.push(random.range(0.72, 1.18));
    state.asteroids.push({
      x: point.x,
      y: point.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: random.range(ASTEROID.minRadius, ASTEROID.maxRadius),
      spin: random.range(-0.9, 0.9),
      angle: random.range(0, TAU),
      verts,
    });
  }

  function startFlareWarning() {
    state.flare.phase = 'warn';
    state.flare.timer = 1.2;
    state.banner = { text: 'SOLAR FLARE INCOMING', sub: 'Clear the blast lanes!', timer: 1.6 };
  }

  function fireFlare() {
    const count = Math.min(EMBER.maxCount, EMBER.count + (state.wave - 1) * EMBER.countPerWave);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU + random.range(-0.12, 0.12);
      state.embers.push({
        x: STAR.x + Math.cos(angle) * (STAR.radius + 6),
        y: STAR.y + Math.sin(angle) * (STAR.radius + 6),
        vx: Math.cos(angle) * EMBER.speed * random.range(0.85, 1.15),
        vy: Math.sin(angle) * EMBER.speed * random.range(0.85, 1.15),
        life: 4,
      });
    }
    state.flare.phase = 'idle';
    state.flare.timer = WAVE.flareInterval;
    state.starPulse = 1;
  }

  function hitShip(fromX, fromY) {
    const ship = state.ship;
    if (ship.invuln > 0) return 0;
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    ship.invuln = SHIP.invulnerable;
    particles.burst(ship.x, ship.y, 42, '#5ef2e0', 320, 0.9, 3.5);
    particles.burst(ship.x, ship.y, 24, '#ff5e6c', 220, 0.7, 3);
    particles.addShake(12);
    // Knock the ship away from whatever hit it, so one hit cannot chain into another.
    const dx = ship.x - fromX;
    const dy = ship.y - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    ship.vx = (dx / dist) * 320;
    ship.vy = (dy / dist) * 320;
    if (state.lives <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.waveTime = 0;
    state.shardsCollected = 0;
    state.maxCombo = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.shards.length = 0;
    state.asteroids.length = 0;
    state.embers.length = 0;
    state.flare = { phase: 'idle', timer: WAVE.flareInterval };
    state.banner = { text: 'WAVE 1', sub: 'Harvest the starfall', timer: 2 };
    state.starPulse = 0;
    shardTimer = 0.4;
    asteroidTimer = 2.8;
    particles.clear();
    placeShip();
  }

  function gravityAt(x, y) {
    const dx = STAR.x - x;
    const dy = STAR.y - y;
    const dist = Math.max(STAR.gravityFloor, Math.hypot(dx, dy));
    const pull = STAR.gravity / dist;
    return { x: (dx / dist) * pull, y: (dy / dist) * pull };
  }

  function step(dt, thrust, attract) {
    let events = 0;
    state.time += dt;
    state.starPulse = Math.max(0, state.starPulse - dt * 1.4);
    if (state.banner.timer > 0) state.banner.timer -= dt;

    // Waves: every WAVE.seconds the field gets busier and the star gets angrier.
    if (!attract) {
      state.waveTime += dt;
      if (state.waveTime >= WAVE.seconds && state.wave < WAVE.max) {
        state.wave += 1;
        state.waveTime = 0;
        state.banner = { text: `WAVE ${state.wave}`, sub: state.wave >= WAVE.flareFrom ? 'Flares incoming — watch the star' : 'More rock in the lanes', timer: 2.2 };
        events |= EVENT_WAVE;
      }
      if (state.wave >= WAVE.flareFrom) {
        if (state.flare.phase === 'idle') {
          state.flare.timer -= dt;
          if (state.flare.timer <= 0) startFlareWarning();
        } else if (state.flare.phase === 'warn') {
          state.flare.timer -= dt;
          if (state.flare.timer <= 0) {
            fireFlare();
            events |= EVENT_FLARE;
          }
        }
      }
    }

    // Spawning.
    shardTimer -= dt;
    if (shardTimer <= 0) {
      spawnShard();
      shardTimer = Math.max(SHARD.minInterval, SHARD.interval - (state.wave - 1) * SHARD.intervalPerWave) * random.range(0.8, 1.25);
    }
    if (!attract) {
      asteroidTimer -= dt;
      if (asteroidTimer <= 0) {
        spawnAsteroid();
        asteroidTimer = Math.max(ASTEROID.minInterval, ASTEROID.interval - (state.wave - 1) * ASTEROID.intervalPerWave) * random.range(0.85, 1.2);
      }
    }

    // The ship: thrust, star gravity, drag, speed cap, soft walls.
    const ship = state.ship;
    ship.invuln = Math.max(0, ship.invuln - dt);
    ship.thrusting = thrust !== null;
    if (thrust) {
      ship.vx += thrust.x * SHIP.thrust * dt;
      ship.vy += thrust.y * SHIP.thrust * dt;
      ship.angle = Math.atan2(thrust.y, thrust.x);
    }
    const pull = gravityAt(ship.x, ship.y);
    ship.vx += pull.x * dt;
    ship.vy += pull.y * dt;
    const drag = Math.exp(-SHIP.drag * dt);
    ship.vx *= drag;
    ship.vy *= drag;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    if (ship.x < SHIP.radius) { ship.x = SHIP.radius; ship.vx = Math.abs(ship.vx) * 0.5; }
    if (ship.x > FIELD.width - SHIP.radius) { ship.x = FIELD.width - SHIP.radius; ship.vx = -Math.abs(ship.vx) * 0.5; }
    if (ship.y < SHIP.radius) { ship.y = SHIP.radius; ship.vy = Math.abs(ship.vy) * 0.5; }
    if (ship.y > FIELD.height - SHIP.radius) { ship.y = FIELD.height - SHIP.radius; ship.vy = -Math.abs(ship.vy) * 0.5; }
    if (speed > 40) ship.angle = Math.atan2(ship.vy, ship.vx);
    ship.trail.unshift({ x: ship.x, y: ship.y });
    if (ship.trail.length > 16) ship.trail.pop();
    if (ship.thrusting) {
      particles.flame(ship.x - Math.cos(ship.angle) * 14, ship.y - Math.sin(ship.angle) * 14, ship.angle);
    }

    // Combo clock.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Shards fall toward the star; collect them before they burn.
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const shard = state.shards[i];
      const g = gravityAt(shard.x, shard.y);
      shard.vx += g.x * 0.35 * dt;
      shard.vy += g.y * 0.35 * dt;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.phase += shard.spin * dt;
      const dStar = Math.hypot(shard.x - STAR.x, shard.y - STAR.y);
      if (dStar < STAR.radius) {
        particles.burst(shard.x, shard.y, 8, '#ffb347', 120, 0.4, 2);
        state.shards.splice(i, 1);
        if (!attract) events |= EVENT_BURN;
        continue;
      }
      const dShip = Math.hypot(shard.x - ship.x, shard.y - ship.y);
      if (dShip < SHARD.radius + SHIP.radius + 4) {
        state.shards.splice(i, 1);
        if (!attract) {
          state.combo = Math.min(state.combo + 1, COMBO.max);
          state.comboTimer = COMBO.window;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          const gained = SHARD.points * state.combo;
          state.score += gained;
          state.shardsCollected += 1;
          particles.burst(shard.x, shard.y, 14, '#ffd166', 200, 0.5, 2.5);
          particles.popup(shard.x, shard.y - 14, `+${gained}`, state.combo > 1 ? '#ffd166' : '#f4f6ff');
          events |= EVENT_PICKUP;
        }
      }
    }

    // Asteroids drift and spin; a hit costs a life.
    for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
      const rock = state.asteroids[i];
      const g = gravityAt(rock.x, rock.y);
      rock.vx += g.x * 0.12 * dt;
      rock.vy += g.y * 0.12 * dt;
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.angle += rock.spin * dt;
      if (rock.x < -80 || rock.x > FIELD.width + 80 || rock.y < -80 || rock.y > FIELD.height + 80) {
        state.asteroids.splice(i, 1);
        continue;
      }
      if (!attract && Math.hypot(rock.x - ship.x, rock.y - ship.y) < rock.radius + SHIP.radius - 2) {
        state.asteroids.splice(i, 1);
        events |= hitShip(rock.x, rock.y);
        if (events & EVENT_OVER) break;
      }
    }

    // Flare embers fly outward and fade.
    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const ember = state.embers[i];
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      ember.life -= dt;
      if (ember.life <= 0 || ember.x < -40 || ember.x > FIELD.width + 40 || ember.y < -40 || ember.y > FIELD.height + 40) {
        state.embers.splice(i, 1);
        continue;
      }
      if (!attract && Math.hypot(ember.x - ship.x, ember.y - ship.y) < EMBER.radius + SHIP.radius - 2) {
        state.embers.splice(i, 1);
        events |= hitShip(ember.x, ember.y);
        if (events & EVENT_OVER) break;
      }
    }

    // The star's heat is a hazard too: fly too close and it takes a life.
    if (!attract && Math.hypot(ship.x - STAR.x, ship.y - STAR.y) < STAR.heatRadius) {
      events |= hitShip(STAR.x, STAR.y);
    }

    particles.update(dt);
    return events;
  }

  reset();
  return { state, particles, reset, step };
}
