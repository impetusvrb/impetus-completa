'use strict';

/**
 * IMPETUS — Environmental Cognitive Service (Fase 11)
 * Expansão cognitiva para impacto ambiental: dados, normalização, adaptação.
 *
 * Integra: environmentalMockService (substitui dados mock por dados reais quando disponíveis).
 *
 * Feature flag: IMPETUS_ENVIRONMENTAL_COGNITIVE_ENABLED (default: false)
 */

const { v4: uuidv4 } = require('uuid');

const ENV_ENABLED =
  String(process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_ENABLED || 'false').trim().toLowerCase() === 'true';

const ENVIRONMENTAL_DOMAINS = Object.freeze({
  ENERGY: 'energy',
  WATER: 'water',
  EMISSIONS: 'emissions',
  WASTE: 'waste',
  COMPLIANCE: 'compliance',
  EFFICIENCY: 'efficiency'
});

const UNITS = Object.freeze({
  KWH: 'kWh',
  M3: 'm³',
  KG_CO2: 'kg_CO2',
  KG: 'kg',
  PERCENT: '%',
  INDEX: 'index'
});

const _dataStore = new Map();
const _normalizedSnapshots = new Map();
const MAX_HISTORY_PER_TENANT = 500;

let _dataPointsIngested = 0;
let _normalizationsRun = 0;
let _cognitiveAdaptations = 0;

/**
 * Environmental Data Layer (Fase 11.1)
 * Ingestão de dados ambientais.
 */
function ingestEnvironmentalData(companyId, data = {}) {
  if (!companyId) return { ingested: false, reason: 'no_company_id' };

  const entry = {
    entry_id: uuidv4(),
    company_id: String(companyId),
    domain: Object.values(ENVIRONMENTAL_DOMAINS).includes(data.domain)
      ? data.domain : ENVIRONMENTAL_DOMAINS.ENERGY,
    metric_key: data.metric_key || data.key || 'unknown',
    value: data.value != null ? Number(data.value) : null,
    unit: data.unit || UNITS.KWH,
    source: data.source || 'manual',
    timestamp: data.timestamp || new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    metadata: _safeClone(data.metadata || {})
  };

  const key = String(companyId);
  if (!_dataStore.has(key)) _dataStore.set(key, []);
  const history = _dataStore.get(key);
  history.push(entry);
  if (history.length > MAX_HISTORY_PER_TENANT) {
    history.splice(0, history.length - MAX_HISTORY_PER_TENANT);
  }

  _dataPointsIngested++;
  return { ingested: true, entry_id: entry.entry_id };
}

/**
 * Environmental Normalization (Fase 11.2)
 * Normaliza dados brutos em indicadores comparáveis.
 */
function normalizeSnapshot(companyId) {
  const history = _dataStore.get(String(companyId));
  if (!history || !history.length) {
    return { company_id: companyId, normalized: false, reason: 'no_data' };
  }

  const snapshot = {
    company_id: String(companyId),
    normalized_at: new Date().toISOString(),
    domains: {}
  };

  for (const domain of Object.values(ENVIRONMENTAL_DOMAINS)) {
    const entries = history.filter(e => e.domain === domain);
    if (!entries.length) continue;

    const recentEntries = entries.slice(-50);
    const values = recentEntries.filter(e => e.value != null).map(e => e.value);

    if (!values.length) continue;

    const sum = values.reduce((s, v) => s + v, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = recentEntries[recentEntries.length - 1];

    let trend = 'stable';
    if (values.length >= 5) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      const delta = (avgSecond - avgFirst) / (avgFirst || 1);
      if (delta > 0.05) trend = 'increasing';
      else if (delta < -0.05) trend = 'decreasing';
    }

    snapshot.domains[domain] = {
      latest_value: latest.value,
      latest_unit: latest.unit,
      latest_timestamp: latest.timestamp,
      average: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      samples: values.length,
      trend,
      efficiency_index: _computeEfficiencyIndex(domain, avg, values)
    };
  }

  _normalizedSnapshots.set(String(companyId), snapshot);
  _normalizationsRun++;

  return snapshot;
}

function _computeEfficiencyIndex(domain, avg, values) {
  if (!values.length) return null;

  switch (domain) {
    case ENVIRONMENTAL_DOMAINS.ENERGY:
      return avg < 100 ? 'excellent' : avg < 500 ? 'good' : avg < 1000 ? 'average' : 'poor';
    case ENVIRONMENTAL_DOMAINS.WATER:
      return avg < 50 ? 'excellent' : avg < 200 ? 'good' : avg < 500 ? 'average' : 'poor';
    case ENVIRONMENTAL_DOMAINS.EMISSIONS:
      return avg < 10 ? 'excellent' : avg < 50 ? 'good' : avg < 100 ? 'average' : 'poor';
    case ENVIRONMENTAL_DOMAINS.WASTE:
      return avg < 5 ? 'excellent' : avg < 20 ? 'good' : avg < 50 ? 'average' : 'poor';
    default:
      return 'unknown';
  }
}

/**
 * Environmental Cognitive Adapter (Fase 11.3)
 * Adapta dados ambientais para consumo pelo pipeline cognitivo.
 */
function adaptForCognitive(companyId) {
  const snapshot = _normalizedSnapshots.get(String(companyId));
  if (!snapshot) {
    normalizeSnapshot(companyId);
    return adaptForCognitive(companyId);
  }

  _cognitiveAdaptations++;

  const domains = snapshot.domains || {};
  const alerts = [];
  const insights = [];

  for (const [domain, data] of Object.entries(domains)) {
    if (data.efficiency_index === 'poor') {
      alerts.push({
        domain,
        type: 'environmental_alert',
        severity: 'high',
        message: `${domain}: eficiência classificada como "poor" (média: ${data.average} ${data.latest_unit}).`
      });
    }
    if (data.trend === 'increasing' && ['emissions', 'waste', 'energy', 'water'].includes(domain)) {
      alerts.push({
        domain,
        type: 'trend_alert',
        severity: 'medium',
        message: `${domain}: tendência crescente detectada.`
      });
    }
    if (data.efficiency_index === 'excellent') {
      insights.push({
        domain,
        type: 'positive_insight',
        message: `${domain}: operação em nível de excelência ambiental.`
      });
    }
  }

  return {
    company_id: String(companyId),
    adapted_at: new Date().toISOString(),
    domains: Object.keys(domains),
    alerts,
    insights,
    cognitive_context: {
      environmental_pressure: alerts.filter(a => a.severity === 'high').length > 2 ? 'high' : 'normal',
      compliance_risk: alerts.length > 5 ? 'elevated' : 'normal',
      sustainability_score: _computeSustainabilityScore(domains)
    },
    raw_snapshot: snapshot
  };
}

function _computeSustainabilityScore(domains) {
  const indices = Object.values(domains).map(d => d.efficiency_index).filter(Boolean);
  if (!indices.length) return null;

  const scoreMap = { excellent: 100, good: 75, average: 50, poor: 25, unknown: 0 };
  const avg = indices.reduce((s, idx) => s + (scoreMap[idx] || 0), 0) / indices.length;
  return Math.round(avg);
}

/**
 * Environmental Executive Panel Data (Fase 11.4)
 */
function getExecutivePanelData(companyId) {
  const adapted = adaptForCognitive(companyId);
  const snapshot = _normalizedSnapshots.get(String(companyId));

  return {
    company_id: String(companyId),
    generated_at: new Date().toISOString(),
    sustainability_score: adapted.cognitive_context.sustainability_score,
    environmental_pressure: adapted.cognitive_context.environmental_pressure,
    compliance_risk: adapted.cognitive_context.compliance_risk,
    domains: snapshot ? snapshot.domains : {},
    alerts: adapted.alerts,
    insights: adapted.insights,
    trends: snapshot ? Object.entries(snapshot.domains).map(([k, v]) => ({
      domain: k, trend: v.trend, latest: v.latest_value, unit: v.latest_unit
    })) : []
  };
}

function getMetrics() {
  return {
    data_points_ingested: _dataPointsIngested,
    normalizations_run: _normalizationsRun,
    cognitive_adaptations: _cognitiveAdaptations,
    tenants_tracked: _dataStore.size,
    environmental_enabled: ENV_ENABLED
  };
}

function getHealth() {
  return {
    status: !ENV_ENABLED ? 'disabled' : 'healthy',
    metrics: getMetrics()
  };
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

module.exports = {
  ENVIRONMENTAL_DOMAINS,
  UNITS,
  ENV_ENABLED,
  ingestEnvironmentalData,
  normalizeSnapshot,
  adaptForCognitive,
  getExecutivePanelData,
  getMetrics,
  getHealth
};
