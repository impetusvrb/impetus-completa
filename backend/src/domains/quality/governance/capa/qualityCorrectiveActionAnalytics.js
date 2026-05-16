'use strict';

const { recurrenceScore, effectivenessWindow } = require('./qualityCapaIntelligence');

function correctiveActionScoring({ history, opened_at, closed_at }) {
  const rec = recurrenceScore(history || []);
  const eff = effectivenessWindow(opened_at, closed_at);
  const score = eff.score != null ? Math.max(0, eff.score - rec * 0.5) : null;
  return { recurrence: rec, effectiveness: eff, composite_score: score, advisory_only: true };
}

module.exports = {
  correctiveActionScoring
};
