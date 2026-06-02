'use strict';

/**
 * FASE 46 — Explicações operacionais determinísticas (F40–45 → explicabilidade auditável).
 */
const explanationConfig = require('../config/explanationIntelligenceConfig');
const anomalyConfig = require('../config/anomalyBaselineConfig');

const SNAPSHOT_KEYS = {
  telemetry: 'telemetry_snapshot',
  trend: 'trend_snapshot',
  anomaly: 'anomaly_snapshot',
  correlation: 'correlation_snapshot',
  event: 'event_snapshot',
  pattern: 'pattern_snapshot'
};

function buildOperationalExplanation({
  entity_type,
  entity_id,
  equipment_id = null,
  explanation_type = 'observational',
  summary = '',
  evidence = [],
  evidence_chain = {},
  contribution = null
}) {
  return {
    entity_type: String(entity_type),
    entity_id: String(entity_id),
    equipment_id: equipment_id ? String(equipment_id) : null,
    explanation_type,
    summary: String(summary || ''),
    evidence: [...evidence],
    evidence_chain: { ...evidence_chain },
    contribution: contribution || null,
    observational_only: true,
    no_prediction: true,
    no_causality: true,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function snapshotRef(layer, bundle = {}, equipmentId = null) {
  const plc = bundle.plc;
  const trend = bundle.trend;
  const anomaly = bundle.anomaly;
  const correlation = bundle.correlation;
  const eventPack = bundle.event_pack;
  const patternPack = bundle.pattern_pack;

  switch (layer) {
    case 'telemetry':
      return {
        layer: 'telemetry',
        source_table: 'plc_collected_data',
        available: !!plc?.snapshot,
        equipment_count: plc?.snapshot?.equipment_count ?? 0,
        telemetry_health: plc?.snapshot?.telemetry_health?.score ?? null
      };
    case 'trend':
      return {
        layer: 'trend',
        source_table: 'plc_collected_data',
        available: !!(trend?.trend_snapshot?.equipment?.length),
        equipment_id: equipmentId,
        has_row: equipmentId
          ? (trend?.trend_snapshot?.equipment || []).some((e) => e.equipment_id === equipmentId)
          : false
      };
    case 'anomaly':
      return {
        layer: 'anomaly',
        source_table: 'plc_collected_data',
        available: !!(anomaly?.anomalies?.length),
        anomaly_count: anomaly?.anomaly_count ?? anomaly?.anomalies?.length ?? 0,
        equipment_id: equipmentId
      };
    case 'correlation':
      return {
        layer: 'correlation',
        source_table: 'plc_collected_data',
        available: !!(correlation?.correlation_pairs?.length),
        correlation_count: correlation?.correlation_count ?? 0,
        equipment_id: equipmentId
      };
    case 'event':
      return {
        layer: 'event',
        source_table: 'plc_collected_data',
        available: !!(eventPack?.events?.length),
        event_count: eventPack?.event_count ?? 0
      };
    case 'pattern':
      return {
        layer: 'pattern',
        source_table: 'plc_collected_data',
        available: !!(patternPack?.patterns?.length),
        pattern_count: patternPack?.pattern_count ?? 0
      };
    default:
      return { layer, available: false };
  }
}

function buildEvidenceChain(entityType, bundle = {}, equipmentId = null) {
  const chain = {
    telemetry: snapshotRef('telemetry', bundle, equipmentId),
    trend: snapshotRef('trend', bundle, equipmentId),
    anomaly: snapshotRef('anomaly', bundle, equipmentId),
    correlation: snapshotRef('correlation', bundle, equipmentId),
    event: snapshotRef('event', bundle, equipmentId),
    pattern: snapshotRef('pattern', bundle, equipmentId),
    entity_type: entityType,
    equipment_id: equipmentId,
    llm_text_used: false
  };
  chain.complete =
    chain.telemetry.available &&
    (entityType === 'telemetry' ||
      chain.trend.available ||
      chain.anomaly.available ||
      chain.event.available ||
      chain.pattern.available);
  return chain;
}

/**
 * 46-D — Pesos efectivos usados nos motores (sem inferência).
 */
function buildOperationalContributionAnalysis(ctx = {}) {
  const {
    target = 'attention_score',
    equipment_id,
    anomalies = [],
    attention = null,
    risk = null,
    event = null,
    pattern = null
  } = ctx;

  const contributions = [];
  const scores = {};

  if (target === 'attention_score' || target === 'all') {
    const cfg = anomalyConfig.attention_score;
    const weights = [];
    for (const a of anomalies) {
      let pts = 0;
      if (a.classification === 'critical_anomaly') pts = cfg.critical_anomaly_points;
      else if (a.classification === 'anomaly') pts = cfg.anomaly_points;
      else if (a.classification === 'attention') pts = cfg.attention_points;
      if (pts > 0) {
        weights.push({
          signal: a.signal,
          raw_points: pts,
          metric: 'attention_score',
          detail: `${a.signal} (${a.classification}, desvio ${a.deviation_percent ?? a.variation_percent ?? '—'}%)`
        });
      }
    }
    if (attention?.factors?.includes('alarms_observed') || ctx.alarm_active) {
      weights.push({
        signal: 'alarm_state',
        raw_points: cfg.alarm_signal_points,
        metric: 'attention_score',
        detail: 'alarm_state (leituras de alarme observadas)'
      });
    }
    const total = weights.reduce((s, w) => s + w.raw_points, 0) || 1;
    for (const w of weights) {
      contributions.push({
        signal: w.signal,
        metric: 'attention_score',
        contribution_percent: Math.round((w.raw_points / total) * 100),
        raw_points: w.raw_points,
        detail: w.detail
      });
    }
    if (attention?.attention_score != null) {
      scores.attention_score = attention.attention_score;
    }
  }

  if ((target === 'risk_score' || target === 'all') && risk) {
    const factors = risk.factors || [];
    const bump = factors.length ? 100 / factors.length : 0;
    for (const f of factors.slice(0, 8)) {
      const sig = String(f).split('_')[0];
      contributions.push({
        signal: sig === 'alarms' ? 'alarm_state' : sig,
        metric: 'risk_score',
        contribution_percent: Math.round(bump),
        detail: `factor observado: ${f}`
      });
    }
    scores.risk_score = risk.risk_score;
  }

  if ((target === 'event_confidence' || target === 'all') && event) {
    const ev = event.evidence || {};
    const keys = Object.keys(ev).filter(
      (k) => ev[k] != null && !['observational_only', 'no_prediction'].includes(k)
    );
    const share = keys.length ? Math.round(100 / keys.length) : 0;
    for (const k of keys) {
      contributions.push({
        signal: (event.signals || [])[0] || k,
        metric: 'event_confidence',
        contribution_percent: share,
        detail: `${k}=${ev[k]}`
      });
    }
    scores.event_confidence = event.event_confidence;
  }

  if ((target === 'pattern_confidence' || target === 'all') && pattern) {
    contributions.push({
      signal: 'occurrences',
      metric: 'pattern_confidence',
      contribution_percent: Math.min(100, (pattern.occurrences || 0) * 12),
      detail: `occurrences=${pattern.occurrences}`
    });
    contributions.push({
      signal: 'windows',
      metric: 'pattern_confidence',
      contribution_percent: Math.min(40, (pattern.windows || []).length * 8),
      detail: `windows=${(pattern.windows || []).join(',')}`
    });
    scores.pattern_confidence = pattern.pattern_confidence;
  }

  return {
    equipment_id: equipment_id || null,
    target,
    scores,
    contributions: contributions.filter((c) => c.signal && c.metric),
    observational_only: true,
    no_inference: true,
    generated_at: new Date().toISOString()
  };
}

function buildEventExplanation(event = {}, bundle = {}) {
  const eqId = event.equipment_id;
  const eqAnomalies = (bundle.anomaly?.anomalies || []).filter((a) => a.equipment_id === eqId);
  const attention = (bundle.anomaly?.equipment_attention || []).find((a) => a.equipment_id === eqId);
  const risk = (bundle.trend?.equipment_risk || []).find((r) => r.equipment_id === eqId);

  const evidence = [];
  for (const a of eqAnomalies.filter((x) => (event.signals || []).includes(x.signal))) {
    evidence.push({
      type: 'anomaly',
      signal: a.signal,
      deviation_percent: a.deviation_percent ?? a.variation_percent,
      classification: a.classification,
      source: SNAPSHOT_KEYS.anomaly
    });
  }
  if (event.evidence?.correlation != null) {
    evidence.push({
      type: 'correlation',
      correlation: event.evidence.correlation,
      source: SNAPSHOT_KEYS.correlation
    });
  }
  if (attention?.attention_score != null) {
    evidence.push({
      type: 'attention',
      attention_score: attention.attention_score,
      attention_level: attention.attention_level,
      source: SNAPSHOT_KEYS.anomaly
    });
  }

  const contribution = buildOperationalContributionAnalysis({
    target: 'all',
    equipment_id: eqId,
    anomalies: eqAnomalies,
    attention,
    risk,
    event,
    alarm_active: event.evidence?.alarm_active
  });

  const parts = [];
  if (eqAnomalies.length) {
    const top = eqAnomalies[0];
    parts.push(
      `anomalia em ${top.signal} (${top.classification}, desvio ${top.deviation_percent ?? '—'}%)`
    );
  }
  if (attention?.attention_score) parts.push(`attention_score ${attention.attention_score}`);
  if (event.event_confidence) parts.push(`event_confidence ${event.event_confidence}`);

  const summary =
    `Evento ${event.event_type} classificado com base em evidências observadas` +
    (parts.length ? `: ${parts.join('; ')}.` : '.');

  return buildOperationalExplanation({
    entity_type: 'event',
    entity_id: event.event_type || 'unknown',
    equipment_id: eqId,
    summary,
    evidence,
    evidence_chain: buildEvidenceChain('event', bundle, eqId),
    contribution
  });
}

function buildPatternExplanation(pattern = {}, bundle = {}) {
  const eqId = pattern.equipment_id;
  const relatedEvents = (bundle.event_pack?.events || []).filter(
    (e) =>
      e.equipment_id === eqId &&
      (pattern.signals || []).some((s) => (e.signals || []).includes(s))
  );

  const evidence = [
    {
      type: 'pattern',
      pattern_type: pattern.pattern_type,
      occurrences: pattern.occurrences,
      windows: pattern.windows,
      source: SNAPSHOT_KEYS.pattern
    }
  ];
  for (const e of relatedEvents.slice(0, 5)) {
    evidence.push({
      type: 'event',
      event_type: e.event_type,
      window: e.window,
      event_confidence: e.event_confidence,
      source: SNAPSHOT_KEYS.event
    });
  }

  const contribution = buildOperationalContributionAnalysis({
    target: 'pattern_confidence',
    equipment_id: eqId,
    pattern
  });

  const summary =
    `Padrão ${pattern.pattern_type} identificado por ${pattern.occurrences} ocorrência(s) observada(s)` +
    ` nas janelas ${(pattern.windows || []).join(', ') || '—'}.`;

  return buildOperationalExplanation({
    entity_type: 'pattern',
    entity_id: pattern.pattern_type || 'unknown',
    equipment_id: eqId,
    summary,
    evidence,
    evidence_chain: buildEvidenceChain('pattern', bundle, eqId),
    contribution
  });
}

function buildAttentionExplanation(equipmentId, bundle = {}) {
  const eqAnomalies = (bundle.anomaly?.anomalies || []).filter((a) => a.equipment_id === equipmentId);
  const attention = (bundle.anomaly?.equipment_attention || []).find((a) => a.equipment_id === equipmentId);
  const risk = (bundle.trend?.equipment_risk || []).find((r) => r.equipment_id === equipmentId);
  const snap = bundle.plc?.snapshot;

  const evidence = eqAnomalies.map((a) => ({
    type: 'anomaly',
    signal: a.signal,
    deviation_percent: a.deviation_percent ?? a.variation_percent,
    classification: a.classification,
    source: SNAPSHOT_KEYS.anomaly
  }));
  if (attention) {
    evidence.push({
      type: 'attention',
      attention_score: attention.attention_score,
      factors: attention.factors,
      source: SNAPSHOT_KEYS.anomaly
    });
  }
  if (risk) {
    evidence.push({
      type: 'risk',
      risk_score: risk.risk_score,
      risk_level: risk.risk_level,
      source: SNAPSHOT_KEYS.trend
    });
  }
  if (snap?.telemetry_health) {
    evidence.push({
      type: 'telemetry_health',
      score: snap.telemetry_health.score,
      source: SNAPSHOT_KEYS.telemetry
    });
  }

  const contribution = buildOperationalContributionAnalysis({
    target: 'all',
    equipment_id: equipmentId,
    anomalies: eqAnomalies,
    attention,
    risk,
    alarm_active: snap?.alarm_active
  });

  const topContrib = (contribution.contributions || [])
    .filter((c) => c.metric === 'attention_score')
    .sort((a, b) => b.contribution_percent - a.contribution_percent)[0];

  const summary =
    `Atenção operacional observável para ${equipmentId}` +
    (attention ? ` (attention_score ${attention.attention_score})` : '') +
    (topContrib ? `. Principal contribuição observada: ${topContrib.signal} (${topContrib.contribution_percent}%).` : '.');

  return buildOperationalExplanation({
    entity_type: 'attention',
    entity_id: equipmentId,
    equipment_id: equipmentId,
    summary,
    evidence,
    evidence_chain: buildEvidenceChain('attention', bundle, equipmentId),
    contribution
  });
}

function buildCorrelationExplanation(pair = {}, bundle = {}) {
  const evidence = [
    {
      type: 'correlation',
      signal_a: pair.signal_a,
      signal_b: pair.signal_b,
      correlation: pair.correlation,
      classification: pair.classification,
      window: pair.window,
      source: SNAPSHOT_KEYS.correlation
    }
  ];

  const summary =
    `Correlação observada entre ${pair.signal_a} e ${pair.signal_b}` +
    ` (r=${pair.correlation}, ${pair.classification}, janela ${pair.window || '—'}).`;

  return buildOperationalExplanation({
    entity_type: 'correlation',
    entity_id: `${pair.signal_a}_${pair.signal_b}`,
    equipment_id: pair.equipment_id,
    summary,
    evidence,
    evidence_chain: buildEvidenceChain('correlation', bundle, pair.equipment_id),
    contribution: null
  });
}

/**
 * 46-G — Cadeia Telemetria → … → Explanation
 */
function buildOperationalTraceabilityMap(bundle = {}, explanations = []) {
  const layers = [
    { step: 1, layer: 'telemetry', label: 'Telemetria', ref: snapshotRef('telemetry', bundle) },
    { step: 2, layer: 'trend', label: 'Trend', ref: snapshotRef('trend', bundle) },
    { step: 3, layer: 'anomaly', label: 'Anomaly', ref: snapshotRef('anomaly', bundle) },
    { step: 4, layer: 'correlation', label: 'Correlation', ref: snapshotRef('correlation', bundle) },
    { step: 5, layer: 'event', label: 'Event', ref: snapshotRef('event', bundle) },
    { step: 6, layer: 'pattern', label: 'Pattern', ref: snapshotRef('pattern', bundle) },
    {
      step: 7,
      layer: 'explanation',
      label: 'Explanation',
      ref: {
        available: explanations.length > 0,
        explanation_count: explanations.length
      }
    }
  ];

  const chain_complete =
    layers.slice(0, 6).every((l) => l.ref.available) && explanations.length > 0;

  return {
    layers,
    chain_complete,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

async function loadIntelligenceBundle(companyId) {
  const plcIntel = require('./plcOperationalIntelligenceService');
  const plcTrend = require('./plcTrendAnalysisService');
  const plcAnomaly = require('./plcAnomalyAnalysisService');
  const plcCorrelation = require('./plcCorrelationAnalysisService');
  const operationalEvents = require('./operationalEventIntelligenceService');
  const operationalPatterns = require('./operationalPatternIntelligenceService');

  const [plc, trend, anomaly, correlation, event_pack, pattern_pack] = await Promise.all([
    plcIntel.buildPlcOperationalPack(companyId).catch(() => null),
    plcTrend.buildOperationalTrendPack(companyId).catch(() => null),
    plcAnomaly.buildOperationalAnomalyPack(companyId).catch(() => null),
    plcCorrelation.buildOperationalCorrelationPack(companyId).catch(() => null),
    operationalEvents.buildOperationalEventPack(companyId).catch(() => null),
    operationalPatterns.buildOperationalPatternPack(companyId).catch(() => null)
  ]);

  return { plc, trend, anomaly, correlation, event_pack, pattern_pack };
}

async function buildOperationalExplanationPack(companyId) {
  if (!companyId) {
    return {
      explanations: [],
      traceability: buildOperationalTraceabilityMap({}, []),
      explanation_count: 0,
      source_table: 'plc_collected_data'
    };
  }

  const bundle = await loadIntelligenceBundle(companyId);
  const explanations = [];
  const seen = new Set();
  const max = explanationConfig.max_explanations_per_pack;

  const nonNormalEvents = (bundle.event_pack?.events || []).filter(
    (e) => e.event_type !== 'NORMAL_OPERATION'
  );
  for (const ev of nonNormalEvents) {
    const key = `event|${ev.equipment_id}|${ev.event_type}|${ev.window}`;
    if (seen.has(key) || explanations.length >= max) continue;
    seen.add(key);
    explanations.push(buildEventExplanation(ev, bundle));
  }

  for (const p of (bundle.pattern_pack?.patterns || []).filter((x) => x.observed_pattern)) {
    const key = `pattern|${p.equipment_id}|${p.pattern_type}`;
    if (seen.has(key) || explanations.length >= max) continue;
    seen.add(key);
    explanations.push(buildPatternExplanation(p, bundle));
  }

  for (const att of (bundle.anomaly?.equipment_attention || []).filter(
    (a) => a.attention_score > anomalyConfig.attention_score.levels.normal_max
  )) {
    const key = `attention|${att.equipment_id}`;
    if (seen.has(key) || explanations.length >= max) continue;
    seen.add(key);
    explanations.push(buildAttentionExplanation(att.equipment_id, bundle));
  }

  for (const c of (bundle.correlation?.correlation_pairs || []).slice(0, 4)) {
    const key = `corr|${c.equipment_id}|${c.signal_a}|${c.signal_b}`;
    if (seen.has(key) || explanations.length >= max) continue;
    seen.add(key);
    explanations.push(buildCorrelationExplanation(c, bundle));
  }

  const traceability = buildOperationalTraceabilityMap(bundle, explanations);

  return {
    explanations,
    traceability,
    contribution_samples: explanations
      .filter((e) => e.contribution?.contributions?.length)
      .map((e) => ({
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        contribution: e.contribution
      }))
      .slice(0, 8),
    explanation_count: explanations.length,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function collectExplanationEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    evidence.add(String(Number(n)));
    evidence.add(String(Math.round(Number(n))));
  };
  for (const ex of pack.explanations || []) {
    for (const ev of ex.evidence || []) {
      add(ev.attention_score);
      add(ev.deviation_percent);
      add(ev.correlation);
      add(ev.risk_score);
      add(ev.occurrences);
      add(ev.event_confidence);
    }
    for (const c of ex.contribution?.contributions || []) {
      add(c.contribution_percent);
      add(c.raw_points);
    }
  }
  return evidence;
}

function formatExplanationsForChat(pack = {}) {
  const items = pack.explanations || [];
  if (!items.length) return '';

  const lines = [
    'Explicações operacionais observáveis (NÃO afirmar causa raiz / previsão):',
    `- Total explicações: ${pack.explanation_count ?? items.length}`
  ];

  for (const ex of items.slice(0, 8)) {
    lines.push(`  • [${ex.entity_type}] ${ex.equipment_id || '—'} — ${ex.entity_id}: ${ex.summary}`);
    const top = (ex.contribution?.contributions || [])
      .filter((c) => c.contribution_percent != null)
      .sort((a, b) => b.contribution_percent - a.contribution_percent)
      .slice(0, 3);
    if (top.length) {
      lines.push(
        `    Contribuições: ${top.map((c) => `${c.signal} ${c.contribution_percent}%`).join(', ')}`
      );
    }
  }

  if (pack.traceability?.chain_complete) {
    lines.push('- Cadeia de rastreabilidade: completa (snapshots PLC → explanation).');
  }

  return lines.join('\n');
}

function buildLiveFeedExplanations(explanationPack = {}) {
  const events = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const items = (explanationPack.explanations || []).slice(0, explanationConfig.feed.max_items);

  for (const ex of items) {
    events.push({
      id: `plc-expl-${ex.entity_type}-${ex.entity_id}-${now.getTime()}`,
      time: timeStr,
      severity: 'low',
      type: 'EXPLANATION_GENERATED',
      message: `[PLC] ${ex.summary?.slice(0, 120) || ex.entity_id}`,
      source_table: 'plc_collected_data',
      audit_evidence: ex,
      verification_state: 'plc_observed'
    });
  }

  if (explanationPack.traceability?.chain_complete) {
    events.push({
      id: `plc-trace-${now.getTime()}`,
      time: timeStr,
      severity: 'low',
      type: 'TRACEABILITY_AVAILABLE',
      message: '[PLC] Mapa de rastreabilidade operacional disponível.',
      source_table: 'plc_collected_data',
      audit_evidence: explanationPack.traceability,
      verification_state: 'plc_observed'
    });
    events.push({
      id: `plc-evchain-${now.getTime()}`,
      time: timeStr,
      severity: 'low',
      type: 'EVIDENCE_CHAIN_COMPLETED',
      message: '[PLC] Cadeia de evidências snapshots PLC concluída.',
      source_table: 'plc_collected_data',
      audit_evidence: { layers: explanationPack.traceability?.layers?.length },
      verification_state: 'plc_observed'
    });
  }

  return events;
}

module.exports = {
  SNAPSHOT_KEYS,
  buildOperationalExplanation,
  buildEvidenceChain,
  buildOperationalContributionAnalysis,
  buildEventExplanation,
  buildPatternExplanation,
  buildAttentionExplanation,
  buildCorrelationExplanation,
  buildOperationalTraceabilityMap,
  buildOperationalExplanationPack,
  loadIntelligenceBundle,
  collectExplanationEvidenceNumbers,
  formatExplanationsForChat,
  buildLiveFeedExplanations
};
