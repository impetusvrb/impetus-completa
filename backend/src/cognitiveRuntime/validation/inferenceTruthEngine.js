'use strict';

const crypto = require('crypto');
const { loadInferences, saveInferences } = require('./inferenceValidationStore');

function _infId() {
  return `inf_${crypto.randomBytes(6).toString('hex')}`;
}

function _extractInferences(payload = {}) {
  const items = [];
  const ts = new Date().toISOString();

  const questions = [
    ...(payload.quality_contextual_questions || []),
    ...(payload.production_contextual_questions || []),
    ...(payload.maintenance_contextual_questions || [])
  ];

  for (const q of questions.slice(0, 6)) {
    items.push({
      inference_id: _infId(),
      runtime_source: 'runtime_z',
      inference_type: 'contextual_question',
      prediction: typeof q === 'string' ? q : q.q || q.question,
      operational_outcome: typeof q === 'object' ? q.a || q.answer : null,
      validation_state: q.a || q.answer ? 'partially_correct' : 'pending',
      truth_score: q.a || q.answer ? 0.72 : 0.45,
      false_positive: false,
      confidence_delta: 0,
      validated_at: ts
    });
  }

  if (payload.specialized_summary) {
    items.push({
      inference_id: _infId(),
      runtime_source: 'runtime_z',
      inference_type: 'operational_narrative',
      prediction: String(payload.specialized_summary).slice(0, 300),
      operational_outcome: null,
      validation_state: 'pending',
      truth_score: 0.55,
      false_positive: false,
      confidence_delta: 0,
      validated_at: ts
    });
  }

  if (payload.governance_learning?.patterns_detected?.length) {
    for (const p of payload.governance_learning.patterns_detected.slice(0, 3)) {
      items.push({
        inference_id: _infId(),
        runtime_source: 'governance_learning',
        inference_type: 'learning_pattern',
        prediction: p.pattern || p.id || JSON.stringify(p).slice(0, 120),
        operational_outcome: null,
        validation_state: 'weak',
        truth_score: 0.5,
        false_positive: false,
        confidence_delta: 0,
        validated_at: ts
      });
    }
  }

  return items;
}

function validateInferences(user = {}, payload = {}, ctx = {}) {
  const tenantId = user?.company_id || 'default';
  const store = loadInferences(tenantId);
  const incoming = ctx.inferences || _extractInferences(payload);
  const merged = [...store.inferences, ...incoming].slice(-200);
  saveInferences(tenantId, { inferences: merged, tenant_id: tenantId });

  const validated = merged.filter((i) => ['confirmed', 'partially_correct'].includes(i.validation_state));
  const rejected = merged.filter((i) => i.validation_state === 'rejected' || i.false_positive);
  const weak = merged.filter((i) => i.validation_state === 'weak' || i.validation_state === 'pending');

  const truth_scores = merged.map((i) => i.truth_score ?? 0).filter((n) => n > 0);
  const inference_truth_score = truth_scores.length
    ? Number((truth_scores.reduce((a, b) => a + b, 0) / truth_scores.length).toFixed(3))
    : 0;

  return {
    inferences: merged.slice(-12),
    inference_truth_score,
    confirmed_count: validated.length,
    rejected_count: rejected.length,
    weak_count: weak.length,
    false_positive_count: merged.filter((i) => i.false_positive).length,
    auto_mutation: false
  };
}

module.exports = { validateInferences, _extractInferences };
