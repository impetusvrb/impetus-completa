'use strict';

function composeNarrative(parts = {}) {
  const line = String(parts.headline || '').trim();
  const detail = String(parts.detail || '').trim();
  const action = String(parts.suggested_follow_up || '').trim();
  const bits = [line, detail, action].filter(Boolean);
  return bits.join(' ');
}

function paretoStory(defectCounts = {}) {
  const entries = Object.entries(defectCounts).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top) return 'Sem dados de defeito agregados para narrativa.';
  return `Pareto operacional: "${top[0]}" concentra maior parte das ocorrências reportadas neste período.`;
}

module.exports = {
  composeNarrative,
  paretoStory
};
