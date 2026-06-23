/**
 * ANAM-P0-WAKEWORD — matching estrito da wake phrase oficial.
 * Aceita apenas prefixo «ok/okay» + variante fonética de «impetus».
 */

const WAKE_PHRASE_PATTERNS = [
  /\b(ok|okay)\s+(impetus|impetis|impetos|impets|empetus)\b/,
  /\b(ok|okay)\s+em\s+petus\b/,
  /\b(ok|okay)\s+im\s+petus\b/
];

/** Frases de referência para certificação (aceites). */
export const WAKE_PHRASE_ACCEPTED_SAMPLES = [
  'ok impetus',
  'okay impetus',
  'Ok Impetus abre o painel',
  'okay impetis'
];

/** Frases de referência para certificação (rejeitadas). */
export const WAKE_PHRASE_REJECTED_SAMPLES = [
  'impetus',
  'sistema impetus',
  'abre impetus',
  'impetus relatório',
  'impetus painel',
  'oi impetus',
  'hey impetus',
  'o impetus'
];

export function normalizeWakeTranscript(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {boolean} */
export function matchesWakePhrase(rawTranscript) {
  const t = normalizeWakeTranscript(rawTranscript);
  if (!t) return false;
  return WAKE_PHRASE_PATTERNS.some((p) => p.test(t));
}

/** Ring buffer de auditoria (dev/cert). */
export function logWakeRecognition(rawTranscript, matched) {
  const entry = {
    at: new Date().toISOString(),
    transcript: String(rawTranscript || '').slice(0, 240),
    matched: !!matched,
    normalized: normalizeWakeTranscript(rawTranscript).slice(0, 240)
  };
  if (typeof window === 'undefined') return entry;
  const prev = Array.isArray(window.__IMPETUS_WAKE_LOG__) ? window.__IMPETUS_WAKE_LOG__ : [];
  window.__IMPETUS_WAKE_LOG__ = [...prev, entry].slice(-50);
  try {
    if (sessionStorage.getItem('impetus-wake-audit-log') === '1') {
      console.info('[IMPETUS wake]', entry);
    }
  } catch (_) {}
  return entry;
}
