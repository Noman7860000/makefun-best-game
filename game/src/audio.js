// All sound is synthesized with WebAudio: no audio files, nothing fetched. The engine is
// created lazily on the first player gesture (browsers block audio before one) and every call
// is a no-op until then, so the game never crashes on a silent machine.
import { COMBO } from './config.js';

const MUSIC_BPM = 96;
/** A-minor arpeggio the music walks through, in Hz. */
const MUSIC_NOTES = [110.0, 130.81, 164.81, 220.0, 164.81, 130.81, 196.0, 246.94];
const MUSIC_BASS = [55.0, 55.0, 65.41, 49.0];

function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicOn = false;
  let nextNoteTime = 0;
  let noteIndex = 0;
  let thrustNodes = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.05;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  /** Resume the context after a gesture; call from any button or key handler. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone({ frequency, endFrequency = null, duration, type = 'sine', volume = 0.2, when = 0, slideTo = null }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
    else if (endFrequency !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function noise({ duration, volume = 0.25, lowpass = 1200, when = 0 }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },

    /** A pickup blip that climbs in pitch with the combo, so chains feel rewarding. */
    pickup(combo) {
      const step = Math.min(combo, COMBO.max);
      const base = 520 * Math.pow(1.059463, step);
      tone({ frequency: base, duration: 0.12, type: 'sine', volume: 0.22 });
      tone({ frequency: base * 1.5, duration: 0.16, type: 'triangle', volume: 0.12, when: 0.03 });
    },
    /** A shard burning up in the star: a dull, downward sigh. */
    burn() {
      tone({ frequency: 320, endFrequency: 140, duration: 0.25, type: 'triangle', volume: 0.08 });
    },
    explosion() {
      noise({ duration: 0.5, volume: 0.4, lowpass: 900 });
      tone({ frequency: 160, endFrequency: 40, duration: 0.45, type: 'sawtooth', volume: 0.25 });
    },
    flareWarn() {
      tone({ frequency: 440, duration: 0.18, type: 'square', volume: 0.08 });
      tone({ frequency: 440, duration: 0.18, type: 'square', volume: 0.08, when: 0.25 });
    },
    flareBurst() {
      noise({ duration: 0.35, volume: 0.2, lowpass: 2400 });
    },
    wave() {
      tone({ frequency: 392, duration: 0.14, type: 'triangle', volume: 0.16 });
      tone({ frequency: 523.25, duration: 0.2, type: 'triangle', volume: 0.16, when: 0.12 });
    },
    gameOver() {
      const notes = [392, 311.13, 261.63, 196];
      notes.forEach((frequency, i) => tone({ frequency, duration: 0.34, type: 'triangle', volume: 0.18, when: i * 0.22 }));
    },
    start() {
      tone({ frequency: 261.63, duration: 0.12, type: 'triangle', volume: 0.16 });
      tone({ frequency: 392, duration: 0.12, type: 'triangle', volume: 0.16, when: 0.1 });
      tone({ frequency: 523.25, duration: 0.22, type: 'triangle', volume: 0.18, when: 0.2 });
    },

    /** A soft looped engine hum while thrusting; silent otherwise. */
    setThrust(on) {
      if (!ensure()) return;
      if (on && !thrustNodes) {
        const osc = context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 68;
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.08);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        osc.start();
        thrustNodes = { osc, gain };
      } else if (!on && thrustNodes) {
        const { osc, gain } = thrustNodes;
        thrustNodes = null;
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
        osc.stop(context.currentTime + 0.12);
      }
    },

    startMusic() {
      if (!ensure() || musicOn) return;
      musicOn = true;
      nextNoteTime = context.currentTime + 0.1;
      noteIndex = 0;
    },
    stopMusic() {
      musicOn = false;
    },
    /** Schedules the next music notes a little ahead of time; call once a frame. */
    updateMusic() {
      if (!ensure() || !musicOn || muted) return;
      const beat = 60 / MUSIC_BPM / 2;
      while (nextNoteTime < context.currentTime + 0.15) {
        const i = noteIndex;
        const note = MUSIC_NOTES[i % MUSIC_NOTES.length];
        const bass = MUSIC_BASS[Math.floor(i / 2) % MUSIC_BASS.length];
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.value = note;
        gain.gain.setValueAtTime(0.0001, nextNoteTime);
        gain.gain.exponentialRampToValueAtTime(0.5, nextNoteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + beat * 0.9);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(nextNoteTime);
        osc.stop(nextNoteTime + beat);
        if (i % 2 === 0) {
          const bosc = context.createOscillator();
          const bgain = context.createGain();
          bosc.type = 'triangle';
          bosc.frequency.value = bass;
          bgain.gain.setValueAtTime(0.0001, nextNoteTime);
          bgain.gain.exponentialRampToValueAtTime(0.7, nextNoteTime + 0.02);
          bgain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + beat * 1.8);
          bosc.connect(bgain);
          bgain.connect(musicGain);
          bosc.start(nextNoteTime);
          bosc.stop(nextNoteTime + beat * 2);
        }
        nextNoteTime += beat;
        noteIndex += 1;
      }
    },
  };
}

export { createAudio };
