'use strict';

const CRIT_PATTERNS = {
  critical: [/(parada|paralisa|desligar emergencia|emergencia)/i, /(acidente|fatalidade|grave)/i, /(vazamento)/i],
  high: [/(falha|defeito critico|nao conformidade grave|nr-?12|nr-?10)/i, /(downtime|oee.{0,10}cair)/i],
  medium: [/(treinamento|capa|auditoria|spc)/i, /(manutencao|preventiva|preditiva)/i],
  low: [/(comunicado|aviso|reuniao|atualizacao)/i]
};

function _normalize(t = '') {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCriticality(text = '', ctx = {}) {
  const t = _normalize(text);
  let level = 'low';
  const reasons = [];
  for (const [lvl, patterns] of Object.entries(CRIT_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(t)) {
        reasons.push({ level: lvl, pattern: String(p) });
        if (['critical', 'high', 'medium', 'low'].indexOf(lvl) < ['critical', 'high', 'medium', 'low'].indexOf(level)) {
          level = lvl;
        }
      }
    }
  }
  const incident_boost = ctx?.operational?.critical_incidents > 0 ? 1 : 0;
  if (incident_boost && level === 'low') level = 'medium';

  const score = {
    critical: 1,
    high: 0.75,
    medium: 0.5,
    low: 0.25
  }[level];

  return {
    level,
    score,
    reasons,
    incident_boost: !!incident_boost
  };
}

module.exports = { inferCriticality };
