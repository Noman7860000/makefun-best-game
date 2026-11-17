// Everything the player sees: the starfield, the star, the ship and its trail, shards,
// asteroids, flare embers, particles, the HUD and the title / pause / game-over screens.
// The playfield is a fixed 1280x720 logical area, letterboxed into the window.
import { ASTEROID, EMBER, FIELD, FONT, LIVES, PALETTE, SHARD, SHIP, STAR, WAVE } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

function formatScore(value) {
  return value.toLocaleString('en-US');
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = createRandom(1337);
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: background.range(0, FIELD.width),
      y: background.range(0, FIELD.height),
      radius: background.range(0.6, 2.1),
      phase: background.range(0, TAU),
      speed: background.range(0.6, 2.2),
      dim: background.chance(0.7),
    });
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.backdrop);
    gradient.addColorStop(0.55, PALETTE.deep);
    gradient.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.sin(time * star.speed + star.phase);
      ctx.globalAlpha = (star.dim ? 0.35 : 0.8) * twinkle;
      ctx.fillStyle = star.dim ? '#cdd6ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStar(state, time) {
    const pulse = 1 + Math.sin(time * 1.8) * 0.03 + state.starPulse * 0.12;
    const radius = STAR.radius * pulse;
    // Halo.
    const halo = ctx.createRadialGradient(STAR.x, STAR.y, radius * 0.4, STAR.x, STAR.y, radius * 3.4);
    halo.addColorStop(0, 'rgba(255, 179, 71, 0.34)');
    halo.addColorStop(0.45, 'rgba(255, 94, 58, 0.14)');
    halo.addColorStop(1, 'rgba(255, 94, 58, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(STAR.x, STAR.y, radius * 3.4, 0, TAU);
    ctx.fill();
    // Corona spikes.
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU + time * 0.12;
      const length = radius * (1.25 + 0.22 * Math.sin(time * 2.4 + i * 1.7));
      ctx.beginPath();
      ctx.moveTo(STAR.x + Math.cos(angle) * radius * 0.95, STAR.y + Math.sin(angle) * radius * 0.95);
      ctx.lineTo(STAR.x + Math.cos(angle) * length, STAR.y + Math.sin(angle) * length);
      ctx.stroke();
    }
    // Body.
    const body = ctx.createRadialGradient(STAR.x - radius * 0.25, STAR.y - radius * 0.25, radius * 0.1, STAR.x, STAR.y, radius);
    body.addColorStop(0, PALETTE.starCore);
    body.addColorStop(0.55, PALETTE.starMid);
    body.addColorStop(1, PALETTE.starEdge);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(STAR.x, STAR.y, radius, 0, TAU);
    ctx.fill();
    // Flare warning ring.
    if (state.flare.phase === 'warn') {
      const warn = 0.5 + 0.5 * Math.sin(time * 14);
      ctx.strokeStyle = `rgba(255, 94, 108, ${0.45 + warn * 0.45})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.arc(STAR.x, STAR.y, radius + 52 + warn * 10, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Heat line: the ring inside which the star takes a life. Faint, always on, so the
    // boundary is a fair, readable rule instead of a surprise.
    ctx.strokeStyle = `rgba(255, 94, 108, ${0.14 + 0.08 * Math.sin(time * 2)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(STAR.x, STAR.y, STAR.heatRadius + 8, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawOrbitGuide() {
    ctx.strokeStyle = 'rgba(154, 163, 199, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.arc(STAR.x, STAR.y, 280, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawShard(shard, time) {
    const glow = ctx.createRadialGradient(shard.x, shard.y, 1, shard.x, shard.y, SHARD.radius * 2.6);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.5)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, SHARD.radius * 2.6, 0, TAU);
    ctx.fill();
    const size = SHARD.radius * (1 + 0.12 * Math.sin(time * 5 + shard.phase));
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.phase);
    ctx.fillStyle = PALETTE.shard;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.shardCore;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.45);
    ctx.lineTo(size * 0.32, 0);
    ctx.lineTo(0, size * 0.45);
    ctx.lineTo(-size * 0.32, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    for (let i = 0; i < rock.verts.length; i += 1) {
      const angle = (i / rock.verts.length) * TAU;
      const r = rock.radius * rock.verts[i];
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fillStyle = PALETTE.asteroidDark;
    ctx.fill();
    ctx.strokeStyle = PALETTE.asteroid;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.25, -rock.radius * 0.15, rock.radius * 0.22, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rock.radius * 0.3, rock.radius * 0.3, rock.radius * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawShip(state, time) {
    const ship = state.ship;
    // Trail.
    for (let i = ship.trail.length - 1; i >= 0; i -= 1) {
      const point = ship.trail[i];
      const fade = 1 - i / ship.trail.length;
      ctx.globalAlpha = fade * 0.35;
      ctx.fillStyle = PALETTE.ship;
      ctx.beginPath();
      ctx.arc(point.x, point.y, SHIP.radius * 0.55 * fade + 1, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const blink = ship.invuln > 0 && Math.sin(time * 28) > 0;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.globalAlpha = blink ? 0.35 : 1;
    if (ship.thrusting) {
      const flame = 16 + Math.sin(time * 40) * 6 + Math.random() * 5;
      const flameGrad = ctx.createLinearGradient(-SHIP.radius, 0, -SHIP.radius - flame, 0);
      flameGrad.addColorStop(0, 'rgba(255, 209, 102, 0.95)');
      flameGrad.addColorStop(1, 'rgba(255, 94, 58, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-SHIP.radius + 2, -6);
      ctx.lineTo(-SHIP.radius - flame, 0);
      ctx.lineTo(-SHIP.radius + 2, 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ship;
    ctx.beginPath();
    ctx.moveTo(SHIP.radius + 6, 0);
    ctx.lineTo(-SHIP.radius, -11);
    ctx.lineTo(-SHIP.radius * 0.45, 0);
    ctx.lineTo(-SHIP.radius, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.shipCore;
    ctx.beginPath();
    ctx.arc(2, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (ship.invuln > 0) {
      ctx.strokeStyle = `rgba(94, 242, 224, ${0.35 + 0.25 * Math.sin(time * 10)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, SHIP.radius + 9, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawEmber(ember) {
    const glow = ctx.createRadialGradient(ember.x, ember.y, 1, ember.x, ember.y, EMBER.radius * 2.4);
    glow.addColorStop(0, 'rgba(255, 122, 60, 0.55)');
    glow.addColorStop(1, 'rgba(255, 122, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, EMBER.radius * 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, EMBER.radius, 0, TAU);
    ctx.fill();
  }

  function drawLivesIcon(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = PALETTE.ship;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.8);
    ctx.lineTo(-size * 0.45, 0);
    ctx.lineTo(-size, size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, best) {
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('SCORE', 28, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(formatScore(state.score), 28, 66);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(`BEST ${formatScore(Math.max(best, state.score))}`, 28, 90);
    // Combo meter under the score.
    if (state.combo > 1) {
      const width = 150;
      const ratio = Math.max(0, state.comboTimer / 4);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
      ctx.fillRect(28, 102, width, 7);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(28, 102, width * ratio, 7);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `800 19px ${FONT}`;
      ctx.fillText(`COMBO x${state.combo}`, 28, 132);
    }
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('WAVE', FIELD.width / 2, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(String(state.wave), FIELD.width / 2, 62);
    const waveRatio = Math.min(1, state.waveTime / WAVE.seconds);
    ctx.fillStyle = 'rgba(154, 163, 199, 0.25)';
    ctx.fillRect(FIELD.width / 2 - 60, 72, 120, 5);
    ctx.fillStyle = PALETTE.ship;
    ctx.fillRect(FIELD.width / 2 - 60, 72, 120 * waveRatio, 5);
    // Lives and shards, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < LIVES; i += 1) {
      const x = FIELD.width - 34 - i * 30;
      if (i < state.lives) drawLivesIcon(x, 46, 11);
      else {
        ctx.globalAlpha = 0.25;
        drawLivesIcon(x, 46, 11);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(`SHARDS ${state.shardsCollected}`, FIELD.width - 28, 90);
    // Early hint, bottom centre.
    if (state.wave === 1 && state.time < 9) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(244, 246, 255, 0.75)';
      ctx.font = `600 15px ${FONT}`;
      ctx.fillText('WASD / arrows to thrust  •  hold mouse to steer  •  P pauses  •  M mutes', FIELD.width / 2, FIELD.height - 22);
    }
    // Wave banner.
    if (state.banner.timer > 0) {
      const alpha = Math.min(1, state.banner.timer / 0.6);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 44px ${FONT}`;
      ctx.fillText(state.banner.text, FIELD.width / 2, 168);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(state.banner.sub, FIELD.width / 2, 198);
      ctx.globalAlpha = 1;
    }
  }

  function panel(x, y, width, height) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(154, 163, 199, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(7, 10, 24, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 15px ${FONT}`;
    ctx.fillText('A  GRAVITY  HARVEST  ARCADE', FIELD.width / 2, 108);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `900 96px ${FONT}`;
    ctx.fillText('STARFALL', FIELD.width / 2, 196);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 21px ${FONT}`;
    ctx.fillText('The star is dying. Harvest its falling light — and don’t get pulled in.', FIELD.width / 2, 232);
    // The how-to panel sits on the left, so the star and the demo pilot stay visible
    // on the right half of the screen.
    panel(64, 268, 540, 224);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 17px ${FONT}`;
    ctx.fillText('HOW TO PLAY', 94, 302);
    const lines = [
      ['Thrust', 'WASD / arrow keys — or hold the mouse / finger to steer'],
      ['Harvest', 'Catch gold shards before they burn in the star'],
      ['Combo', 'Chain pickups within 4 s for up to x8 points'],
      ['Survive', 'Dodge asteroids, flare embers and the star’s heat — 3 lives'],
      ['Waves', 'Every 25 s the field gets busier; solar flares from wave 2'],
    ];
    ctx.font = `500 16px ${FONT}`;
    lines.forEach((line, i) => {
      const y = 332 + i * 28;
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(line[0], 94, y);
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(line[1], 198, y);
    });
    ctx.textAlign = 'center';
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 16px ${FONT}`;
      ctx.fillText(`BEST SCORE  ${formatScore(best)}`, FIELD.width / 2, 528);
    }
    ctx.globalAlpha = 0.8 + 0.2 * Math.sin(state.time * 3);
    ctx.fillStyle = PALETTE.ship;
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText('PRESS SPACE OR CLICK TO LAUNCH', FIELD.width / 2, 566);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText('P pauses  •  M mutes  •  R restarts after a run', FIELD.width / 2, 602);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(7, 10, 24, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText('P or Esc to resume  •  M to mute', FIELD.width / 2, FIELD.height / 2 + 34);
  }

  function drawOver(state, best, isNewBest) {
    ctx.fillStyle = 'rgba(7, 10, 24, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `900 72px ${FONT}`;
    ctx.fillText('SIGNAL LOST', FIELD.width / 2, 158);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText('The star kept its light this time.', FIELD.width / 2, 192);
    if (isNewBest) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('★ NEW BEST SCORE ★', FIELD.width / 2, 232);
    }
    panel(FIELD.width / 2 - 300, 258, 600, 208);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText(formatScore(state.score), FIELD.width / 2, 322);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText('FINAL SCORE', FIELD.width / 2, 348);
    const stats = [
      ['BEST', formatScore(best)],
      ['SHARDS', String(state.shardsCollected)],
      ['MAX COMBO', `x${state.maxCombo}`],
      ['WAVE', String(state.wave)],
      ['TIME', formatTime(state.time)],
    ];
    ctx.font = `700 17px ${FONT}`;
    stats.forEach((row, i) => {
      const x = FIELD.width / 2 - 250 + i * 125;
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 12px ${FONT}`;
      ctx.fillText(row[0], x, 392);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText(row[1], x, 420);
    });
    const blink = 0.8 + 0.2 * Math.sin(state.time * 3);
    ctx.globalAlpha = blink;
    ctx.fillStyle = PALETTE.ship;
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 528);
    ctx.globalAlpha = 1;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || FIELD.width;
    const height = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    return dpr;
  }

  return {
    draw(state, screen, best, pointer = null, isNewBest = false) {
      const dpr = resize();
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / FIELD.width, height / FIELD.height);
      const offsetX = (width - FIELD.width * scale) / 2;
      const offsetY = (height - FIELD.height * scale) / 2;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      const shake = state.particles ? state.particles.shakeOffset() : { x: 0, y: 0 };
      ctx.translate(shake.x, shake.y);
      const time = state.time;
      drawBackground(time);
      drawOrbitGuide();
      drawStar(state, time);
      for (const shard of state.shards) drawShard(shard, time);
      for (const rock of state.asteroids) drawAsteroid(rock);
      for (const ember of state.embers) drawEmber(ember);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_TITLE) drawShip(state, time);
      if (pointer && pointer.down && screen === SCREEN_PLAY) {
        ctx.strokeStyle = 'rgba(94, 242, 224, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(state.ship.x, state.ship.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      state.particles.draw(ctx);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      if (screen === SCREEN_PAUSED) drawPaused();
      if (screen === SCREEN_OVER) drawOver(state, best, isNewBest);
      ctx.restore();
    },
  };
}
