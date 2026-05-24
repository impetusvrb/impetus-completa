'use strict';

const flags = require('../config/sz2FeatureFlags');

const _metrics = {
  applied_total: 0,
  shadow_total: 0,
  inherited_context_total: 0,
  actions_prepared_total: 0,
  errors_total: 0,
  last_continuation_score: 0,
  last_reasoning_quality: 0,
  last_industrial_intelligence_score: 0,
  last_awareness_score: 0,
  last_cognitive_density: 0,
  events: []
};

const MAX_EVENTS = 200;

function emit(evt = {}) {
  if (!flags.isObservabilityEnabled()) return;
  const e = { ts: new Date().toISOString(), ...evt };
  _metrics.events.push(e);
  if (_metrics.events.length > MAX_EVENTS) _metrics.events.shift();
}

function incApplied() { _metrics.applied_total += 1; }
function incShadow() { _metrics.shadow_total += 1; }
function incInherited() { _metrics.inherited_context_total += 1; }
function incActions(n = 0) { _metrics.actions_prepared_total += n; }
function incError() { _metrics.errors_total += 1; }

function updateScores({ continuity_score, reasoning_quality, industrial_intelligence_score, awareness_score, cognitive_density }) {
  if (typeof continuity_score === 'number') _metrics.last_continuation_score = continuity_score;
  if (typeof reasoning_quality === 'number') _metrics.last_reasoning_quality = reasoning_quality;
  if (typeof industrial_intelligence_score === 'number') _metrics.last_industrial_intelligence_score = industrial_intelligence_score;
  if (typeof awareness_score === 'number') _metrics.last_awareness_score = awareness_score;
  if (typeof cognitive_density === 'number') _metrics.last_cognitive_density = cognitive_density;
}

function snapshot() {
  return JSON.parse(JSON.stringify(_metrics));
}

module.exports = {
  emit,
  incApplied,
  incShadow,
  incInherited,
  incActions,
  incError,
  updateScores,
  snapshot,
  MAX_EVENTS
};
