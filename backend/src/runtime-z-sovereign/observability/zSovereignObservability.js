'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

const _state = {
  metrics: {
    z_sovereignty_score: 0,
    z_bootstrap_latency_ms: 0,
    z_hydration_latency_ms: 0,
    z_context_assembly_ms: 0,
    z_fallback_activation_count: 0,
    z_blank_screen_prevention_count: 0,
    z_shadow_divergence_score: 0,
    z_runtime_continuity_score: 0,
    z_operational_resilience_score: 0,
    z_compatibility_score: 0,
    z_cognitive_density_score: 0,
    z_contextual_accuracy_score: 0,
    requests_total: 0
  },
  rolling: {
    bootstrap_ms: [],
    hydration_ms: [],
    assembly_ms: [],
    divergence: []
  }
};

const ROLL_MAX = 200;

function _push(arr, v) {
  arr.push(v);
  if (arr.length > ROLL_MAX) arr.shift();
}

function _avg(arr) {
  if (!arr.length) return 0;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3));
}

function emitSZ1(event, meta = {}) {
  if (!flags.isObservabilityEnabled()) return;
  console.info(`[SOVEREIGN_Z] ${event}`, JSON.stringify({ ts: new Date().toISOString(), ...meta }));
}

function recordBootstrapLatency(ms) {
  _push(_state.rolling.bootstrap_ms, ms);
  _state.metrics.z_bootstrap_latency_ms = _avg(_state.rolling.bootstrap_ms);
}

function recordHydrationLatency(ms) {
  _push(_state.rolling.hydration_ms, ms);
  _state.metrics.z_hydration_latency_ms = _avg(_state.rolling.hydration_ms);
}

function recordAssemblyLatency(ms) {
  _push(_state.rolling.assembly_ms, ms);
  _state.metrics.z_context_assembly_ms = _avg(_state.rolling.assembly_ms);
}

function recordDivergence(score) {
  _push(_state.rolling.divergence, score);
  _state.metrics.z_shadow_divergence_score = _avg(_state.rolling.divergence);
}

function incrementFallback() {
  _state.metrics.z_fallback_activation_count += 1;
}

function incrementBlankScreenPrevented() {
  _state.metrics.z_blank_screen_prevention_count += 1;
}

function setMetric(name, value) {
  if (Object.prototype.hasOwnProperty.call(_state.metrics, name)) {
    _state.metrics[name] = value;
  }
}

function incrementRequests() {
  _state.metrics.requests_total += 1;
}

function snapshot() {
  return JSON.parse(JSON.stringify(_state.metrics));
}

module.exports = {
  emitSZ1,
  recordBootstrapLatency,
  recordHydrationLatency,
  recordAssemblyLatency,
  recordDivergence,
  incrementFallback,
  incrementBlankScreenPrevented,
  incrementRequests,
  setMetric,
  snapshot
};
