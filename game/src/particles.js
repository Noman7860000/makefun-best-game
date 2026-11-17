// Particles, floating score popups and screen shake: the juice. One pool, allocated once,
// so a busy explosion never allocates mid-frame.
export function createParticles(capacity = 320) {
  const pool = [];
  for (let i = 0; i < capacity; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 0, gravity: 0 });
  }
  const texts = [];
  let shake = 0;

  function spawn(x, y, vx, vy, life, size, color, drag = 1.5, gravity = 0) {
    for (let i = 0; i < pool.length; i += 1) {
      const p = pool[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.drag = drag;
      p.gravity = gravity;
      return;
    }
  }

  return {
    /** A radial burst of sparks. */
    burst(x, y, count, color, speed = 260, life = 0.7, size = 3) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const v = speed * (0.35 + Math.random() * 0.65);
        spawn(x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.7), color);
      }
    },
    /** A short engine-flame puff behind the ship. */
    flame(x, y, angle) {
      const spread = 0.5;
      const a = angle + Math.PI + (Math.random() - 0.5) * spread;
      const v = 120 + Math.random() * 90;
      spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.28 + Math.random() * 0.15, 2.5 + Math.random() * 2, Math.random() < 0.5 ? '#5ef2e0' : '#ffd166', 2.5);
    },
    /** A rising score popup, e.g. "+30". */
    popup(x, y, text, color = '#ffd166') {
      texts.push({ x, y, text, color, life: 1 });
      if (texts.length > 24) texts.shift();
    },
    addShake(amount) {
      shake = Math.min(18, shake + amount);
    },
    update(dt) {
      shake = Math.max(0, shake - dt * 26);
      for (let i = 0; i < pool.length; i += 1) {
        const p = pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag;
        p.vy *= drag;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.life -= dt * 0.9;
        t.y -= 34 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
    },
    /** The current shake offset; the renderer applies it to the whole scene. */
    shakeOffset() {
      if (shake < 0.2) return { x: 0, y: 0 };
      return {
        x: (Math.random() * 2 - 1) * shake,
        y: (Math.random() * 2 - 1) * shake,
      };
    },
    draw(ctx) {
      for (let i = 0; i < pool.length; i += 1) {
        const p = pool[i];
        if (!p.active) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * (p.life / p.maxLife)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const t of texts) {
        ctx.globalAlpha = Math.min(1, t.life * 1.6);
        ctx.fillStyle = t.color;
        ctx.font = '700 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      for (const p of pool) p.active = false;
      texts.length = 0;
      shake = 0;
    },
  };
}
