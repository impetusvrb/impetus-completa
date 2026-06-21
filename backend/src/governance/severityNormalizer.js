'use strict';

/**
 * EVENT-GOVERNANCE-01 — normalização canónica de severidade.
 */

const CANONICAL = Object.freeze(['info', 'low', 'medium', 'high', 'critical']);

const ALIAS_MAP = Object.freeze({
  info: 'info',
  informational: 'info',
  baixa: 'low',
  low: 'low',
  menor: 'low',
  media: 'medium',
  medio: 'medium',
  medium: 'medium',
  med: 'medium',
  warning: 'medium',
  aviso: 'medium',
  alta: 'high',
  high: 'high',
  urgent: 'high',
  urgente: 'high',
  critica: 'critical',
  critical: 'critical',
  critico: 'critical',
  severe: 'high'
});

/**
 * @param {string|number|null|undefined} raw
 * @returns {'info'|'low'|'medium'|'high'|'critical'}
 */
function normalizeSeverity(raw) {
  const s = String(raw ?? 'info')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0307/g, '')
    .replace(/[\u0300-\u036f]/g, '');

  if (ALIAS_MAP[s]) return ALIAS_MAP[s];
  if (CANONICAL.includes(s)) return s;
  return 'info';
}

module.exports = {
  normalizeSeverity,
  CANONICAL_SEVERITIES: CANONICAL
};
