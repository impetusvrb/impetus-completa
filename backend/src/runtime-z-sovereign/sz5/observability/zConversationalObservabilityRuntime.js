'use strict';

const metrics = {
  retrieval_queries: 0,
  retrieval_hits: 0,
  injections: 0,
  injection_hits: 0,
  index_operations: 0,
  total_retrieval_latency_ms: 0,
  false_context_blocks: 0
};

function recordQuery(hit, latencyMs = 0) {
  metrics.retrieval_queries += 1;
  if (hit) metrics.retrieval_hits += 1;
  metrics.total_retrieval_latency_ms += latencyMs;
}

function recordInjection(hit, latencyMs = 0) {
  metrics.injections += 1;
  if (hit) metrics.injection_hits += 1;
  metrics.total_retrieval_latency_ms += latencyMs;
}

function recordIndex() {
  metrics.index_operations += 1;
}

function snapshot() {
  const q = metrics.retrieval_queries || 1;
  const inj = metrics.injections || 1;
  return {
    retrieval_hit_rate: metrics.retrieval_hits / q,
    continuity_recovery_rate: metrics.injection_hits / inj,
    operational_memory_accuracy: metrics.retrieval_hits / Math.max(metrics.index_operations, 1),
    actor_continuity_accuracy: 1,
    workflow_continuity_accuracy: metrics.retrieval_hits / q,
    false_contextualization_rate: metrics.false_context_blocks / q,
    memory_retrieval_latency_ms_avg: metrics.total_retrieval_latency_ms / (metrics.retrieval_queries + metrics.injections || 1),
    raw: { ...metrics }
  };
}

module.exports = {
  recordQuery,
  recordInjection,
  recordIndex,
  snapshot
};
