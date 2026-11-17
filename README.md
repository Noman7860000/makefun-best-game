# Starfall — Harvest the Falling Stars

A gravity-harvest arcade game. The star is dying: shards of its light fall toward
it, and you pilot a harvester ship around the gravity well to catch them before
they burn — while asteroids drift through the lanes, solar flares burst outward,
and the star's own heat punishes anyone who flies too close.

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network:
the game is plain static files under `game/` and loads fully offline.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Thrust |
| Hold mouse / touch | Steer toward the pointer |
| Space / Enter / click | Start, launch |
| P / Esc | Pause / resume |
| R | Restart after game over |
| M | Mute / unmute |

## Rules

- **Harvest:** catch gold shards before they fall into the star. Each is worth
  10 points times your combo.
- **Combo:** chain pickups within 4 seconds for up to **x8** points. A hit, or
  letting the chain lapse, resets it.
- **Survive:** you have 3 lives. Asteroids, flare embers and the star's heat
  each cost one life (and break your combo). After a hit you are briefly
  shielded.
- **Waves:** every 25 seconds the wave rises — faster, denser rock, and from
  wave 2 the star throws solar flares. Survive as long as you can; the best
  score is kept in your browser.

## Screenshots

The four screenshots in `screenshots/` were taken from the real game running
in headless Chromium: title, mid-play, a wave-3 surge, and the game-over
screen. The game stages those scenes deterministically with
`?shot=start|play|surge|end&seed=1`.

## Tech

Plain HTML + canvas + ES modules, no libraries. WebAudio synthesizes every
sound effect and the music loop — no audio files. Source is split by job:
`config.js` (tuning), `random.js` (seeded RNG), `input.js`, `audio.js`,
`particles.js`, `world.js` (simulation), `render.js` (drawing and screens),
`shots.js` (screenshot scenes), `main.js` (loop).

## License

MIT — see `LICENSE`.
