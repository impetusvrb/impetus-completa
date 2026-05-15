'use strict';

/**
 * IMPETUS — Cognitive Pressure Service (Consolidação F6)
 *
 * Mede o runtime cognitivo como sistema vivo:
 * saturation, arbitration pressure, governance density, event load,
 * memory pressure, cognitive entropy.
 *
 * Runtime Health Score: score composto baseado em latência, consensus,
 * divergence, pressure, drift, stability, saturation.
 *
 * Feature flag: IMPETUS_COGNITIVE_PRESSURE_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const PRESSURE_ENABLED = process.env.IMPETUS_COGNITIVE_PRESSURE_ENABLED !== 'false';

const PRESSURE_DIMENSIONS = Object.freeze({
  SATURATION: 'saturation',
  ARBITRATION_PRESSURE: 'arbitration_pressure',
  GOVERNANCE_DENSITY: 'governance_density',
  EVENT_LOAD: 'event_load',
  MEMORY_PRESSURE: 'memory_pressure',
  COGNITIVE_ENTROPY: 'cognitive_entropy'
});

const HEALTH_DIMENSIONS = Object.freeze({
  LATENCY: 'latency',
  CONSENSUS: 'consensus',
  DIVERGENCE: 'divergence',
  PRESSURE: 'pressure',
  DRIFT: 'drift',
  STABILITY: 'stability',
  SATURATION: 'saturation'
});

const _pressureSamples = [];
const _healthScores = [];
const MAX_SAMPLES = 3000;
const MAX_HEALTH_SCORES = 1000;

let _samplesCollected = 0;
let _healthScoresComputed = 0;
let _alertsGenerated = 0;

/**
 * Coleta uma amostra de pressão cognitiva.
 */
function sample(signals = {}) {
  if (!PRESSURE_ENABLED) return null;

  _samplesCollected++;

  const measurement = {
    sample_id: uuidv4(),
    timestamp: new Date().toISOString(),
    dimensions: {}
  };

  measurement.dimensions[PRESSURE_DIMENSIONS.SATURATION] = _measureSaturation(signals);
  measurement.dimensions[PRESSURE_DIMENSIONS.ARBITRATION_PRESSURE] = _measureArbitrationPressure(signals);
  measurement.dimensions[PRESSURE_DIMENSIONS.GOVERNANCE_DENSITY] = _measureGovernanceDensity(signals);
  measurement.dimensions[PRESSURE_DIMENSIONS.EVENT_LOAD] = _measureEventLoad(signals);
  measurement.dimensions[PRESSURE_DIMENSIONS.MEMORY_PRESSURE] = _measureMemoryPressure(signals);
  measurement.dimensions[PRESSURE_DIMENSIONS.COGNITIVE_ENTROPY] = _measureCognitiveEntropy(signals);

  const values = Object.values(measurement.dimensions).map(d => d.value);
  measurement.overall_pressure = values.length
    ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 100) / 100
    : 0;

  measurement.alert_level = measurement.overall_pressure > 0.8 ? 'critical'
    : measurement.overall_pressure > 0.6 ? 'high'
    : measurement.overall_pressure > 0.4 ? 'medium'
    : 'normal';

  if (measurement.alert_level === 'critical' || measurement.alert_level === 'high') {
    _alertsGenerated++;
  }

  _pressureSamples.push(measurement);
  if (_pressureSamples.length > MAX_SAMPLES) _pressureSamples.splice(0, _pressureSamples.length - MAX_SAMPLES);

  return measurement;
}

function _measureSaturation(signals) {
  const queueDepth = signals.queue_depth || 0;
  const maxQueue = signals.max_queue || 5000;
  const value = Math.min(1, queueDepth / maxQueue);
  return { value: Math.round(value * 1000) / 1000, raw: { queue_depth: queueDepth, max_queue: maxQueue } };
}

function _measureArbitrationPressure(signals) {
  const arbitrationsPerMin = signals.arbitrations_per_min || 0;
  const threshold = signals.arbitration_threshold || 50;
  const value = Math.min(1, arbitrationsPerMin / threshold);
  return { value: Math.round(value * 1000) / 1000, raw: { per_min: arbitrationsPerMin } };
}

function _measureGovernanceDensity(signals) {
  const policiesActive = signals.policies_active || 0;
  const maxPolicies = signals.max_policies || 100;
  const violationsPerMin = signals.violations_per_min || 0;
  const policyRatio = Math.min(1, policiesActive / maxPolicies);
  const violationRatio = Math.min(1, violationsPerMin / 20);
  const value = (policyRatio * 0.4 + violationRatio * 0.6);
  return { value: Math.round(value * 1000) / 1000, raw: { policies: policiesActive, violations_per_min: violationsPerMin } };
}

function _measureEventLoad(signals) {
  const eventsPerSec = signals.events_per_sec || 0;
  const maxEventsPerSec = signals.max_events_per_sec || 200;
  const value = Math.min(1, eventsPerSec / maxEventsPerSec);
  return { value: Math.round(value * 1000) / 1000, raw: { events_per_sec: eventsPerSec } };
}

function _measureMemoryPressure(signals) {
  const heapUsed = signals.heap_used_mb || (process.memoryUsage().heapUsed / 1024 / 1024);
  const heapTotal = signals.heap_total_mb || (process.memoryUsage().heapTotal / 1024 / 1024);
  const value = heapTotal > 0 ? Math.min(1, heapUsed / heapTotal) : 0;
  return { value: Math.round(value * 1000) / 1000, raw: { heap_used_mb: Math.round(heapUsed), heap_total_mb: Math.round(heapTotal) } };
}

function _measureCognitiveEntropy(signals) {
  const divergenceRate = signals.divergence_rate || 0;
  const driftRate = signals.drift_rate || 0;
  const instabilityRate = signals.instability_rate || 0;
  const value = Math.min(1, (divergenceRate + driftRate + instabilityRate) / 3);
  return { value: Math.round(value * 1000) / 1000, raw: { divergence: divergenceRate, drift: driftRate, instability: instabilityRate } };
}

/**
 * Runtime Health Score (F6.2)
 * Score composto que reflecte a saúde do runtime cognitivo.
 */
function computeHealthScore(signals = {}) {
  _healthScoresComputed++;

  const dimensions = {};

  dimensions[HEALTH_DIMENSIONS.LATENCY] = _scoreLatency(signals.avg_latency_ms || 0);
  dimensions[HEALTH_DIMENSIONS.CONSENSUS] = _scoreConsensus(signals.consensus_rate || 0.8);
  dimensions[HEALTH_DIMENSIONS.DIVERGENCE] = _scoreDivergence(signals.divergence_rate || 0);
  dimensions[HEALTH_DIMENSIONS.PRESSURE] = _scorePressure(signals.overall_pressure || 0);
  dimensions[HEALTH_DIMENSIONS.DRIFT] = _scoreDrift(signals.drift_rate || 0);
  dimensions[HEALTH_DIMENSIONS.STABILITY] = _scoreStability(signals.stability_score || 0.8);
  dimensions[HEALTH_DIMENSIONS.SATURATION] = _scoreSaturation(signals.saturation || 0);

  const weights = { latency: 15, consensus: 15, divergence: 15, pressure: 15, drift: 15, stability: 15, saturation: 10 };
  let weightedSum = 0, totalWeight = 0;

  for (const [dim, score] of Object.entries(dimensions)) {
    const w = weights[dim] || 10;
    weightedSum += score * w;
    totalWeight += w;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  const healthScore = {
    score_id: uuidv4(),
    overall_score: overallScore,
    grade: overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B'
      : overallScore >= 60 ? 'C' : overallScore >= 50 ? 'D' : 'F',
    dimensions,
    status: overallScore >= 70 ? 'healthy' : overallScore >= 50 ? 'degraded' : 'critical',
    computed_at: new Date().toISOString()
  };

  _healthScores.push(healthScore);
  if (_healthScores.length > MAX_HEALTH_SCORES) _healthScores.splice(0, _healthScores.length - MAX_HEALTH_SCORES);

  return healthScore;
}

function _scoreLatency(ms) { return ms <= 200 ? 100 : ms <= 500 ? 85 : ms <= 1000 ? 70 : ms <= 2000 ? 50 : ms <= 5000 ? 30 : 10; }
function _scoreConsensus(rate) { return Math.round(rate * 100); }
function _scoreDivergence(rate) { return Math.round((1 - Math.min(1, rate)) * 100); }
function _scorePressure(p) { return Math.round((1 - Math.min(1, p)) * 100); }
function _scoreDrift(rate) { return Math.round((1 - Math.min(1, rate)) * 100); }
function _scoreStability(s) { return Math.round(s * 100); }
function _scoreSaturation(s) { return Math.round((1 - Math.min(1, s)) * 100); }

function getRecentPressureSamples(limit = 30) {
  return _pressureSamples.slice(-Math.min(limit, 200));
}

function getRecentHealthScores(limit = 30) {
  return _healthScores.slice(-Math.min(limit, 200));
}

function getLatestHealthScore() {
  return _healthScores.length > 0 ? _healthScores[_healthScores.length - 1] : null;
}

function getPressureTrend(window = 20) {
  const recent = _pressureSamples.slice(-window);
  if (recent.length < 3) return { trend: 'unknown', samples: recent.length };

  const pressures = recent.map(s => s.overall_pressure);
  const firstHalf = pressures.slice(0, Math.floor(pressures.length / 2));
  const secondHalf = pressures.slice(Math.floor(pressures.length / 2));
  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const delta = avgSecond - avgFirst;

  return {
    trend: delta > 0.05 ? 'increasing' : delta < -0.05 ? 'decreasing' : 'stable',
    delta: Math.round(delta * 1000) / 1000,
    avg_recent: Math.round(avgSecond * 1000) / 1000,
    samples: recent.length
  };
}

function getMetrics() {
  return {
    samples_collected: _samplesCollected,
    health_scores_computed: _healthScoresComputed,
    alerts_generated: _alertsGenerated,
    pressure_enabled: PRESSURE_ENABLED
  };
}

function getHealth() {
  const latest = getLatestHealthScore();
  return {
    status: !PRESSURE_ENABLED ? 'disabled'
      : latest && latest.status === 'critical' ? 'critical'
      : latest && latest.status === 'degraded' ? 'degraded'
      : 'healthy',
    latest_score: latest,
    pressure_trend: getPressureTrend(),
    metrics: getMetrics()
  };
}

module.exports = {
  PRESSURE_DIMENSIONS,
  HEALTH_DIMENSIONS,
  PRESSURE_ENABLED,
  sample,
  computeHealthScore,
  getRecentPressureSamples,
  getRecentHealthScores,
  getLatestHealthScore,
  getPressureTrend,
  getMetrics,
  getHealth
};
