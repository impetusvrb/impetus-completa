'use strict';

const { inferCriticality } = require('./zCriticalityInferenceRuntime');

function inferPriority(text = '', ctx = {}) {
  const crit = inferCriticality(text, ctx);
  const continuity = ctx?.continuity?.continuation_score || 0;
  const urgencyHint = /(urgente|imediato|agora|hoje|dia [0-9])/i.test(String(text || '')) ? 0.2 : 0;

  const score = Number(Math.min(1, crit.score * 0.6 + continuity * 0.2 + urgencyHint).toFixed(3));
  const tier = score >= 0.8 ? 'P1' : score >= 0.6 ? 'P2' : score >= 0.4 ? 'P3' : 'P4';
  return {
    tier,
    score,
    inputs: { criticality_score: crit.score, continuation_score: continuity, urgency_hint: urgencyHint }
  };
}

module.exports = { inferPriority };
