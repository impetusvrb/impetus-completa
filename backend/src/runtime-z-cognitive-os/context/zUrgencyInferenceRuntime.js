'use strict';

function inferUrgency(text = '', ctx = {}) {
  const t = String(text || '').toLowerCase();
  let level = 'normal';
  const hits = [];
  if (/(urgente|imediato|agora)/.test(t)) {
    level = 'high';
    hits.push('keyword:urgente');
  }
  if (/(hoje|24h|dia [0-9])/.test(t)) {
    if (level !== 'high') level = 'medium';
    hits.push('keyword:datetime');
  }
  if (ctx?.operational?.critical_incidents > 0) {
    level = 'high';
    hits.push('operational:critical_incident');
  }
  return { level, signals: hits, urgency_score: { normal: 0.3, medium: 0.6, high: 0.9 }[level] };
}

module.exports = { inferUrgency };
