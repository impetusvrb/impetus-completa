'use strict';

/**
 * Índice em memória das entradas — devolve as N mais recentes por tipo e
 * permite procura simples por keywords (tokenização tolerante).
 */

function _tokenize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_]+/i)
    .filter((w) => w && w.length >= 3);
}

function _score(entry, tokens) {
  const hay = `${entry.summary || ''} ${entry.intent || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
  let score = 0;
  for (const t of tokens) if (hay.includes(t)) score += 1;
  return score;
}

function buildIndex(entries = []) {
  const byType = new Map();
  for (const e of entries) {
    const t = e.type || 'generic';
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(e);
  }
  return {
    byType,
    recent: (limit = 10) => entries.slice(-limit).reverse(),
    byTypeRecent: (type, limit = 5) =>
      (byType.get(type) || []).slice(-limit).reverse(),
    search: (text, limit = 5) => {
      const tokens = _tokenize(text);
      if (!tokens.length) return [];
      return entries
        .map((e) => ({ entry: e, score: _score(e, tokens) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || (b.entry.ts - a.entry.ts))
        .slice(0, limit)
        .map((x) => x.entry);
    }
  };
}

module.exports = { buildIndex, _tokenize };
