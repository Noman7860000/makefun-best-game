// One input source for keyboard, mouse and touch. Keys steer with WASD or arrows; holding
// the pointer down thrusts toward it, so the game plays on a trackpad or a touchscreen too.
// Actions are edge-triggered and consumed by the loop with takeActions().
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const KEY_ACTIONS = {
  Space: ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  KeyR: ACTION_RESTART,
};

const KEY_DIRECTIONS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let queued = 0;
  let pointerDown = false;
  let pointerX = FIELD.width / 2;
  let pointerY = FIELD.height / 2;

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code in KEY_DIRECTIONS || event.code in KEY_ACTIONS) event.preventDefault();
    if (event.repeat) return;
    if (event.code in KEY_ACTIONS) queued |= KEY_ACTIONS[event.code];
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    pointerDown = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const point = toLogical(event.clientX, event.clientY);
    pointerX = point.x;
    pointerY = point.y;
    pointerDown = true;
    queued |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    pointerX = point.x;
    pointerY = point.y;
  });
  const releasePointer = () => {
    pointerDown = false;
  };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('pointerleave', releasePointer);

  return {
    /** The thrust direction for this frame, normalised, or null when idle. */
    thrust(shipX, shipY) {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = KEY_DIRECTIONS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x !== 0 || y !== 0) {
        const length = Math.hypot(x, y);
        return { x: x / length, y: y / length };
      }
      if (pointerDown) {
        const dx = pointerX - shipX;
        const dy = pointerY - shipY;
        const distance = Math.hypot(dx, dy);
        if (distance > 24) return { x: dx / distance, y: dy / distance };
      }
      return null;
    },
    /** The pointer position in logical coordinates (for the aim line). */
    pointer() {
      return { x: pointerX, y: pointerY, down: pointerDown };
    },
    /** Actions pressed since the last call; reading clears them. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
