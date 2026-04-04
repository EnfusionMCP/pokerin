/** Sound effects — stubs for future implementation.
 *
 * Uses Web Audio API when available, falls back silently.
 * Volume is controlled by a single global setting.
 */

let volume = 0.5;
let enabled = true;

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
}

export function setEnabled(on: boolean) {
  enabled = on;
}

export function getVolume() {
  return volume;
}

export function isEnabled() {
  return enabled;
}

// Stub sound triggers — wire these up to actual audio files later
function _play(_name: string) {
  if (!enabled || volume <= 0) return;
  // TODO: load and play audio buffer
  // const ctx = new AudioContext();
  // const source = ctx.createBufferSource();
  // ...
}

export const sounds = {
  cardDeal: () => _play('card-deal'),
  chipClink: () => _play('chip-clink'),
  fold: () => _play('fold'),
  timerWarning: () => _play('timer-warning'),
  winChime: () => _play('win-chime'),
  check: () => _play('check'),
};
