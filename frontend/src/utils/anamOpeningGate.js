/**
 * Controlo da saudação de abertura Anam — só a frase IMPETUS programada.
 */

export function normGreetingText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fala permitida: coincide com a linha programada (Bom dia, Nome. Como posso ajudar?). */
export function isAllowedOpeningSpeech(spoken, expectedLine) {
  const a = normGreetingText(spoken);
  const e = normGreetingText(expectedLine);
  if (!a || !e) return false;
  if (a === e || a.includes(e) || e.includes(a)) return true;
  const eCore = e.replace(/\bcomo posso ajudar\b/g, '').trim();
  return eCore.length >= 8 && a.includes(eCore.slice(0, Math.min(28, eCore.length)));
}

/** Qualquer abertura da persona Liv/IMPETUS que não seja a nossa linha exata. */
export function isForbiddenOpeningSpeech(text) {
  const a = normGreetingText(text);
  if (a.length < 6) return false;
  if (a.includes('impulsion')) return true;
  if (/\bola\b/.test(a) && /\bajudar\b/.test(a)) return true;
  if (a.includes('voce hoje') || a.includes('você hoje')) return true;
  if (a.includes('em que posso') || a.includes('o que posso fazer')) return true;
  if (/\bhey\b/.test(a) && /\bhelp\b/.test(a)) return true;
  return false;
}

export function shouldBlockPersonaOpening({ spoken, expectedLine, userHasSpoken, sessionAgeMs }) {
  if (userHasSpoken) return false;
  if (!Number.isFinite(sessionAgeMs) || sessionAgeMs > 30_000) return false;
  const t = String(spoken || '').trim();
  if (t.length < 6) return false;
  if (isAllowedOpeningSpeech(t, expectedLine)) return false;
  if (isForbiddenOpeningSpeech(t)) return true;
  /* Bloqueia qualquer fala da persona antes do utilizador, exceto a linha exata. */
  return t.length >= 12;
}
