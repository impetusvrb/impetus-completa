'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isEnabled: () => _flag('IMPETUS_SZ5_ENABLED', true),
  isOperationalMemoryEnabled: () => _flag('IMPETUS_SZ5_OPERATIONAL_MEMORY', true),
  isQueryRuntimeEnabled: () => _flag('IMPETUS_SZ5_QUERY_RUNTIME', true),
  isIndexingEnabled: () => _flag('IMPETUS_SZ5_CONVERSATIONAL_INDEXING', true),
  isCrossThreadEnabled: () => _flag('IMPETUS_SZ5_CROSS_THREAD_MEMORY', true),
  isFactRetrievalEnabled: () => _flag('IMPETUS_SZ5_FACT_RETRIEVAL', true),
  isApiEnabled: () => _flag('IMPETUS_SZ5_API', true),
  isObservabilityEnabled: () => _flag('IMPETUS_SZ5_OBSERVABILITY', true),
  maxFactsInPrompt: () => {
    const n = parseInt(process.env.IMPETUS_SZ5_MAX_FACTS_PROMPT || '12', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : 12;
  },
  invariants: Object.freeze({
    additive_only: true,
    facts_before_llm: true,
    governance_first: true,
    tenant_safe: true,
    hierarchy_safe: true,
    motor_a_intact: true,
    engine_v2_intact: true,
    production_ready: true,
    shadow_mode: false
  })
};
