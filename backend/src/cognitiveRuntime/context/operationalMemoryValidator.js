'use strict';

const GENERIC_PATTERNS = [
  /consciência operacional/i,
  /sistema cognitivo/i,
  /análise holística/i,
  /inteligência artificial avançada/i,
  /overview executivo genérico/i
];

function validateOperationalMemory(events = [], correlations = {}) {
  if (!events.length) {
    return {
      memory_quality_score: 0,
      causal_density: 0,
      synthetic_memory_ratio: 0,
      verified_operational_memory: 0,
      rejected_memories: [],
      weak_causality_detected: true
    };
  }

  const rejected = [];
  const verified = [];

  for (const e of events) {
    const text = e.operational_context || '';
    const generic = GENERIC_PATTERNS.some((p) => p.test(text));
    const weakCausal = !e.causal_chain?.length || (e.confidence_score ?? 0) < 0.4;
    const noOrigin = !e.source_runtime || !e.event_type || !e.created_at;

    if (generic || noOrigin) {
      rejected.push({ event_id: e.event_id, reason: generic ? 'generic_narrative' : 'missing_provenance' });
    } else if (weakCausal) {
      rejected.push({ event_id: e.event_id, reason: 'weak_causality' });
    } else {
      verified.push(e.event_id);
    }
  }

  const withCausal = events.filter((e) => (e.causal_chain?.length ?? 0) >= 1);
  const causal_density = Number((withCausal.length / Math.max(events.length, 1)).toFixed(3));
  const synthetic_memory_ratio = Number(
    (events.filter((e) => e.verification_state === 'synthetic').length / Math.max(events.length, 1)).toFixed(3)
  );
  const verified_operational_memory = verified.length;
  const memory_quality_score = Number(
    Math.min(1, causal_density * 0.4 + (verified.length / Math.max(events.length, 1)) * 0.4 + (correlations.confidence_avg || 0) * 0.2).toFixed(3)
  );

  return {
    memory_quality_score,
    causal_density,
    synthetic_memory_ratio,
    verified_operational_memory,
    rejected_memories: rejected,
    weak_causality_detected: causal_density < 0.5 || (correlations.correlations || []).length === 0
  };
}

function buildOperationalMemoryRuntime(events = [], correlations = {}) {
  const validation = validateOperationalMemory(events, correlations);
  return {
    ...validation,
    verified_operational_memory_ratio: Number(
      (validation.verified_operational_memory / Math.max(events.length, 1)).toFixed(3)
    ),
    auto_mutation: false
  };
}

module.exports = { validateOperationalMemory, buildOperationalMemoryRuntime };
