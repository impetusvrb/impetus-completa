'use strict';

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeForMention(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return stripDiacritics(trimmed).toLowerCase();
}

/** Padrões do modo strict (inalterados; padrão quando mode !== 'lenient'). */
function matchesStrict(n) {
  if (/@ia\b/.test(n)) return true;
  if (/@impetus\b/.test(n)) return true;
  if (/(?:^|\s)ia:/.test(n)) return true;
  if (/inteligencia\s+artificial/.test(n)) return true;
  if (/\bai\b/.test(n)) return true;
  return false;
}

/**
 * Padrões extras só com { mode: 'lenient' } — lista explícita, com limites de palavra onde necessário.
 */
function matchesLenient(n) {
  if (/#impetus\b/.test(n)) return true;
  if (/\bimpetus\s+ia\b/.test(n)) return true;
  if (/\bimpetus\s+ai\b/.test(n)) return true;
  if (/\bfala com a ia\b/.test(n)) return true;
  if (/\bchama a ia\b/.test(n)) return true;
  if (/\bpreciso da ia\b/.test(n)) return true;
  if (/\bia me ajuda\b/.test(n)) return true;
  if (/\bai me ajuda\b/.test(n)) return true;
  return false;
}

/**
 * Fonte única de verdade para detecção de menção / gatilho de IA no texto do chat.
 * @param {string} text
 * @param {{ mode?: 'strict' | 'lenient' }} [options]
 * @returns {boolean}
 */
function detectAIMention(text, options = {}) {
  if (typeof text !== 'string') return false;

  const mode = options && options.mode === 'lenient' ? 'lenient' : 'strict';

  const n = normalizeForMention(text);
  if (!n) return false;

  if (matchesStrict(n)) return true;
  if (mode === 'lenient' && matchesLenient(n)) return true;

  return false;
}

module.exports = { detectAIMention };
