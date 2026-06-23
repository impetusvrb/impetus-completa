/**
 * ANAM-P0 — cooldown pós-encerramento antes de religar wake word.
 */

export const WAKE_COOLDOWN_MS = 4000;

let cooldownUntil = 0;

export function beginWakeCooldown(ms = WAKE_COOLDOWN_MS) {
  cooldownUntil = Date.now() + Math.max(0, ms);
  if (typeof window !== 'undefined') {
    window.__IMPETUS_WAKE_COOLDOWN_UNTIL__ = cooldownUntil;
  }
}

export function isInWakeCooldown() {
  return Date.now() < cooldownUntil;
}

export function getWakeCooldownRemainingMs() {
  return Math.max(0, cooldownUntil - Date.now());
}

/**
 * Agenda startWakeWord respeitando cooldown activo.
 * @returns {number|undefined} timeout id
 */
export function scheduleWakeWordAfterCooldown(startFn, extraDelayMs = 0) {
  if (typeof startFn !== 'function') return undefined;
  const wait = getWakeCooldownRemainingMs() + Math.max(0, extraDelayMs);
  return window.setTimeout(() => {
    if (isInWakeCooldown()) return;
    startFn();
  }, wait);
}

export function clearWakeCooldown() {
  cooldownUntil = 0;
  if (typeof window !== 'undefined') {
    window.__IMPETUS_WAKE_COOLDOWN_UNTIL__ = 0;
  }
}
