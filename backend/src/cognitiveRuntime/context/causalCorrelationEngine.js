'use strict';

function detectRecurrence(events, type) {
  const same = events.filter((e) => e.event_type === type);
  return same.length >= 2;
}

function runCausalCorrelation(events = []) {
  if (!events.length) {
    return { correlations: [], patterns: [], confidence_avg: 0, synthetic_blocked: true };
  }

  const correlations = [];
  const byDomain = events.reduce((acc, e) => {
    const d = e.domain || 'unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const qualityEvents = byDomain.quality || [];
  const productionEvents = byDomain.production || [];
  const maintenanceEvents = byDomain.maintenance || [];

  if (qualityEvents.length && productionEvents.length) {
    correlations.push({
      id: 'corr_quality_production',
      domains: ['quality', 'production'],
      hypothesis: 'Desvio qualidade correlacionado com sinal produção',
      confidence_score: Math.min(0.85, 0.5 + qualityEvents.length * 0.05 + productionEvents.length * 0.05),
      evidence_events: [...qualityEvents.slice(-2), ...productionEvents.slice(-1)].map((e) => e.event_id),
      artificial: false
    });
  }

  if (maintenanceEvents.length && productionEvents.length) {
    correlations.push({
      id: 'corr_maintenance_downtime',
      domains: ['maintenance', 'production'],
      hypothesis: 'Confiabilidade manutenção associada a paragens produção',
      confidence_score: Math.min(0.8, 0.45 + maintenanceEvents.length * 0.08),
      evidence_events: [...maintenanceEvents.slice(-1), ...productionEvents.slice(-1)].map((e) => e.event_id),
      artificial: false
    });
  }

  const ncLike = qualityEvents.filter((e) => /nc|não conform|capa|desvio/i.test(e.operational_context || ''));
  if (ncLike.length >= 2) {
    correlations.push({
      id: 'corr_nc_recurrence',
      domains: ['quality'],
      hypothesis: 'Recorrência NC/CAPA detectada na timeline',
      confidence_score: Math.min(0.92, 0.6 + ncLike.length * 0.1),
      evidence_events: ncLike.map((e) => e.event_id),
      artificial: false
    });
  }

  const patterns = [];
  for (const [domain, list] of Object.entries(byDomain)) {
    if (detectRecurrence(list, list[0]?.event_type)) {
      patterns.push({ domain, pattern: 'recurrent_event_type', count: list.length, confidence: 0.7 });
    }
  }

  const confidences = correlations.map((c) => c.confidence_score).filter((n) => n > 0);
  const confidence_avg = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  return {
    correlations: correlations.filter((c) => c.confidence_score >= 0.5),
    patterns,
    confidence_avg: Number(confidence_avg.toFixed(3)),
    weak_causality_filtered: correlations.length - correlations.filter((c) => c.confidence_score >= 0.5).length
  };
}

function buildCausalCorrelationRuntime(events = []) {
  const result = runCausalCorrelation(events);
  return {
    ...result,
    auto_mutation: false,
    auto_decisions: false
  };
}

module.exports = { runCausalCorrelation, buildCausalCorrelationRuntime };
