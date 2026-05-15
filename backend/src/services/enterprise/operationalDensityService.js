'use strict';

/**
 * IMPETUS — Operational Density Service (Consolidação F4)
 *
 * Mede a "densidade operacional" do runtime: quão alimentado está pela realidade.
 * Responsável por: freshness, signal richness, contextual depth, entropy,
 * saturation e operational completeness.
 *
 * Este serviço consome dados do operationalTelemetryService e produz métricas
 * de densidade que alimentam o pipeline cognitivo.
 *
 * Feature flag: IMPETUS_OPERATIONAL_DENSITY_ENABLED (default: true)
 */

const DENSITY_ENABLED = process.env.IMPETUS_OPERATIONAL_DENSITY_ENABLED !== 'false';

const DENSITY_DIMENSIONS = Object.freeze({
  FRESHNESS: 'freshness',
  SIGNAL_RICHNESS: 'signal_richness',
  CONTEXTUAL_DEPTH: 'contextual_depth',
  ENTROPY: 'entropy',
  SATURATION: 'saturation',
  COMPLETENESS: 'completeness'
});

const EXPECTED_DOMAINS = Object.freeze([
  'production', 'maintenance', 'quality', 'energy',
  'logistics', 'workforce', 'environment', 'telemetry'
]);

const _densityHistory = new Map();
const MAX_HISTORY_PER_TENANT = 200;

let _evaluationsTotal = 0;

/**
 * Avalia a densidade operacional para um tenant a partir do snapshot.
 */
function evaluate(snapshot, opts = {}) {
  if (!DENSITY_ENABLED || !snapshot) {
    return _emptyDensity(opts.company_id);
  }

  _evaluationsTotal++;
  const companyId = opts.company_id || snapshot._meta?.company_id || 'unknown';

  const freshness = _evaluateFreshness(snapshot);
  const signalRichness = _evaluateSignalRichness(snapshot);
  const contextualDepth = _evaluateContextualDepth(snapshot);
  const entropy = _evaluateEntropy(snapshot);
  const saturation = _evaluateSaturation(snapshot);
  const completeness = _evaluateCompleteness(snapshot);

  const dimensions = {
    [DENSITY_DIMENSIONS.FRESHNESS]: freshness,
    [DENSITY_DIMENSIONS.SIGNAL_RICHNESS]: signalRichness,
    [DENSITY_DIMENSIONS.CONTEXTUAL_DEPTH]: contextualDepth,
    [DENSITY_DIMENSIONS.ENTROPY]: entropy,
    [DENSITY_DIMENSIONS.SATURATION]: saturation,
    [DENSITY_DIMENSIONS.COMPLETENESS]: completeness
  };

  const scores = Object.values(dimensions).map(d => d.score);
  const overallScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

  const density = {
    company_id: companyId,
    overall_score: overallScore,
    grade: overallScore >= 80 ? 'A' : overallScore >= 60 ? 'B' : overallScore >= 40 ? 'C' : overallScore >= 20 ? 'D' : 'F',
    dimensions,
    cognitive_readiness: overallScore >= 60 ? 'ready' : overallScore >= 40 ? 'partial' : 'insufficient',
    evaluated_at: new Date().toISOString()
  };

  _recordHistory(companyId, density);

  return density;
}

function _evaluateFreshness(snapshot) {
  let totalAge = 0, domainCount = 0;

  for (const domain of EXPECTED_DOMAINS) {
    const d = snapshot[domain];
    if (!d || !d._last_updated) continue;
    const ageMs = Date.now() - new Date(d._last_updated).getTime();
    totalAge += ageMs;
    domainCount++;
  }

  if (domainCount === 0) return { score: 0, detail: 'no_data' };

  const avgAgeMs = totalAge / domainCount;
  let score;
  if (avgAgeMs < 60000) score = 100;
  else if (avgAgeMs < 300000) score = 80;
  else if (avgAgeMs < 900000) score = 50;
  else if (avgAgeMs < 3600000) score = 25;
  else score = 5;

  return { score, avg_age_ms: Math.round(avgAgeMs), domains_with_data: domainCount };
}

function _evaluateSignalRichness(snapshot) {
  let totalMetrics = 0, domainCount = 0;

  for (const domain of EXPECTED_DOMAINS) {
    const d = snapshot[domain];
    if (!d) continue;
    const metricKeys = Object.keys(d).filter(k => !k.startsWith('_'));
    totalMetrics += metricKeys.length;
    domainCount++;
  }

  if (domainCount === 0) return { score: 0, detail: 'no_signals' };

  const avgMetrics = totalMetrics / domainCount;
  const score = Math.min(100, Math.round(avgMetrics * 15));

  return { score, total_metrics: totalMetrics, avg_per_domain: Math.round(avgMetrics * 10) / 10 };
}

function _evaluateContextualDepth(snapshot) {
  let sources = new Set();
  let totalEvents = 0;

  for (const domain of EXPECTED_DOMAINS) {
    const d = snapshot[domain];
    if (!d) continue;
    const events = d._events || [];
    totalEvents += events.length;
    for (const key of Object.keys(d)) {
      if (key.startsWith('_')) continue;
      const metric = d[key];
      if (metric && metric.source) sources.add(metric.source);
    }
  }

  const sourceCount = sources.size;
  const score = Math.min(100, sourceCount * 20 + Math.min(50, totalEvents));

  return { score, unique_sources: sourceCount, total_events: totalEvents };
}

function _evaluateEntropy(snapshot) {
  const domainValues = [];

  for (const domain of EXPECTED_DOMAINS) {
    const d = snapshot[domain];
    if (!d) continue;
    const events = d._events || [];
    if (events.length >= 2) {
      const values = events.filter(e => e.value != null).map(e => e.value);
      if (values.length >= 2) {
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 0;
        domainValues.push(cv);
      }
    }
  }

  if (!domainValues.length) return { score: 50, detail: 'insufficient_variation_data' };

  const avgCv = domainValues.reduce((s, v) => s + v, 0) / domainValues.length;
  const score = avgCv > 0.5 ? 30 : avgCv > 0.3 ? 50 : avgCv > 0.1 ? 80 : 95;

  return { score, avg_coefficient_variation: Math.round(avgCv * 1000) / 1000, domains_analyzed: domainValues.length };
}

function _evaluateSaturation(snapshot) {
  let totalCapacity = 0;

  for (const domain of EXPECTED_DOMAINS) {
    const d = snapshot[domain];
    if (!d) continue;
    const events = d._events || [];
    if (events.length > 80) totalCapacity++;
  }

  const meta = snapshot._meta || {};
  const eventCount = meta.event_count || 0;
  const saturationRatio = Math.min(1, eventCount / 1000);
  const score = Math.round((1 - saturationRatio) * 100);

  return {
    score,
    event_count: eventCount,
    saturation_ratio: Math.round(saturationRatio * 100) / 100,
    domains_near_cap: totalCapacity
  };
}

function _evaluateCompleteness(snapshot) {
  let domainsPresent = 0;

  for (const domain of EXPECTED_DOMAINS) {
    if (snapshot[domain] && snapshot[domain]._last_updated) {
      domainsPresent++;
    }
  }

  const coverageRatio = domainsPresent / EXPECTED_DOMAINS.length;
  const score = Math.round(coverageRatio * 100);

  return {
    score,
    domains_present: domainsPresent,
    domains_expected: EXPECTED_DOMAINS.length,
    coverage_pct: Math.round(coverageRatio * 10000) / 100,
    missing: EXPECTED_DOMAINS.filter(d => !snapshot[d] || !snapshot[d]._last_updated)
  };
}

function _recordHistory(companyId, density) {
  if (!_densityHistory.has(companyId)) _densityHistory.set(companyId, []);
  const history = _densityHistory.get(companyId);
  history.push({
    overall_score: density.overall_score,
    grade: density.grade,
    evaluated_at: density.evaluated_at
  });
  if (history.length > MAX_HISTORY_PER_TENANT) {
    history.splice(0, history.length - MAX_HISTORY_PER_TENANT);
  }
}

function _emptyDensity(companyId) {
  return {
    company_id: companyId || 'unknown',
    overall_score: 0,
    grade: 'F',
    dimensions: {},
    cognitive_readiness: 'insufficient',
    evaluated_at: new Date().toISOString()
  };
}

function getDensityHistory(companyId, limit = 50) {
  const history = _densityHistory.get(String(companyId));
  if (!history) return [];
  return history.slice(-Math.min(limit, MAX_HISTORY_PER_TENANT));
}

function getMetrics() {
  return {
    evaluations_total: _evaluationsTotal,
    tenants_tracked: _densityHistory.size,
    density_enabled: DENSITY_ENABLED
  };
}

function getHealth() {
  return { status: DENSITY_ENABLED ? 'healthy' : 'disabled', metrics: getMetrics() };
}

module.exports = {
  DENSITY_DIMENSIONS,
  EXPECTED_DOMAINS,
  DENSITY_ENABLED,
  evaluate,
  getDensityHistory,
  getMetrics,
  getHealth
};
