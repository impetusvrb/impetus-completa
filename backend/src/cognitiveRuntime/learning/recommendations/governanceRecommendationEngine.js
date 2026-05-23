'use strict';

function buildGovernanceRecommendations(ctx = {}) {
  const recs = [];
  for (const p of ctx.patterns?.patterns_detected || []) {
    recs.push({ id: `pattern_${p.id}`, action: 'review_pattern', pattern: p.id, supervised: true, auto_apply: false, explanation: `Padrão recorrente: ${p.id}` });
  }
  for (const f of ctx.fatigue?.fatigue_patterns || []) {
    recs.push({ id: `fatigue_${f.id}`, action: 'reduce_cognitive_load', supervised: true, auto_apply: false, explanation: 'Fadiga persistente detectada no histórico' });
  }
  if (ctx.usefulness?.trend === 'declining') {
    recs.push({ id: 'usefulness_decline', action: 'review_domain_relevance', supervised: true, auto_apply: false, explanation: 'Tendência de usefulness em declínio' });
  }
  if (ctx.convergence?.convergence_trends?.some((t) => t.direction === 'declining')) {
    recs.push({ id: 'convergence_decline', action: 'monitor_enterprise_alignment', supervised: true, auto_apply: false, explanation: 'Convergência organizacional em deterioração' });
  }
  return { recommendations_generated: recs, count: recs.length };
}

module.exports = { buildGovernanceRecommendations };
