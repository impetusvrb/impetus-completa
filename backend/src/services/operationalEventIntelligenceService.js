'use strict';

/**
 * FASE 44 — Eventos operacionais auditáveis (consolida Fases 40–43, sem ML/previsão/causalidade).
 */
const eventConfig = require('../config/eventIntelligenceConfig');

const EVENT_TYPES = {
  NORMAL_OPERATION: 'NORMAL_OPERATION',
  TELEMETRY_DEGRADATION: 'TELEMETRY_DEGRADATION',
  SIGNAL_INSTABILITY: 'SIGNAL_INSTABILITY',
  CORRELATED_DEVIATION: 'CORRELATED_DEVIATION',
  ALARM_ESCALATION: 'ALARM_ESCALATION',
  EQUIPMENT_ATTENTION_REQUIRED: 'EQUIPMENT_ATTENTION_REQUIRED',
  EQUIPMENT_ATTENTION_CRITICAL: 'EQUIPMENT_ATTENTION_CRITICAL',
  TELEMETRY_RECOVERY: 'TELEMETRY_RECOVERY',
  OBSERVED_OPERATIONAL_CHANGE: 'OBSERVED_OPERATIONAL_CHANGE'
};

function buildOperationalEventEvidence({
  event_type,
  equipment_id,
  signals = [],
  evidence = {},
  severity = 'informational',
  event_confidence = 0,
  window = '24h',
  summary = null
}) {
  return {
    event_type: String(event_type),
    equipment_id: String(equipment_id),
    signals: [...signals],
    evidence: { ...evidence, observational_only: true, no_prediction: true },
    severity,
    event_confidence: Math.min(100, Math.max(0, Math.round(event_confidence))),
    window: String(window),
    summary: summary || null,
    observed_at: new Date().toISOString(),
    source_table: 'plc_collected_data'
  };
}

function computeEventConfidence(evidence = {}, context = {}) {
  const cfg = eventConfig.event_confidence;
  let score = cfg.base_per_evidence;
  const keys = Object.keys(evidence).filter((k) => evidence[k] != null && k !== 'observational_only');
  score += Math.min(40, keys.length * cfg.base_per_evidence);

  if (evidence.anomaly === true || evidence.anomaly_classification === 'critical_anomaly') {
    score += cfg.anomaly_critical_bonus;
  } else if (evidence.anomaly === true) {
    score += cfg.base_per_evidence;
  }
  if (Number(evidence.correlation) >= eventConfig.correlation_strong_min) {
    score += cfg.correlation_strong_bonus;
  }
  if (evidence.alarm_active || evidence.alarm_escalation) {
    score += cfg.alarm_bonus;
  }
  if (evidence.trend && evidence.trend !== 'stable') {
    score += cfg.trend_change_bonus;
  }
  if (context.attention_score >= eventConfig.critical_attention_threshold) {
    score += 10;
  }

  return Math.min(cfg.max_score, Math.max(0, Math.round(score)));
}

function severityForEventType(eventType, overrides = {}) {
  if (overrides.severity) return overrides.severity;
  return eventConfig.severity_map[eventType] || 'informational';
}

/**
 * 44-B — Detecção determinística por equipamento.
 */
function detectOperationalEventsForEquipment(ctx) {
  const {
    equipment_id,
    snapshot = {},
    trendRow = {},
    anomalies = [],
    correlations = [],
    attention = null,
    window = '24h'
  } = ctx;

  const events = [];
  const healthScore = snapshot.telemetry_health?.score ?? 100;
  const healthLabel = snapshot.telemetry_health?.label ?? '';
  const coverage = snapshot.telemetry_coverage ?? 1;
  const alarmActive = snapshot.alarm_active === true;
  const attentionScore = attention?.attention_score ?? 0;

  const anomalySignals = anomalies.map((a) => a.signal);
  const hasCriticalAnomaly = anomalies.some((c) => c.classification === 'critical_anomaly');
  const hasAnomaly = anomalies.length > 0;

  const strongCorr = correlations.filter(
    (c) => c.classification === 'strong' || c.classification === 'very_strong'
  );

  const trendChanges = [];
  for (const [k, v] of Object.entries(trendRow)) {
    if (k === 'equipment_id' || !v || typeof v !== 'object') continue;
    if (v.trend && v.trend !== 'stable') {
      trendChanges.push({ signal: k, trend: v.trend, variation_percent: v.variation_percent });
    }
  }

  if (healthScore < eventConfig.telemetry_health_degraded || coverage < 0.85) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.TELEMETRY_DEGRADATION,
      equipment_id,
      signals: ['telemetry_health'],
      evidence: {
        telemetry_health_score: healthScore,
        telemetry_coverage: coverage,
        health_label: healthLabel
      },
      severity: severityForEventType(EVENT_TYPES.TELEMETRY_DEGRADATION),
      event_confidence: 0,
      window,
      summary: `Degradação observada da telemetria (saúde ${healthScore}, cobertura ${coverage}).`
    });
    ev.event_confidence = computeEventConfidence(ev.evidence, { attention_score: attentionScore });
    events.push(ev);
  }

  if (healthScore >= eventConfig.telemetry_health_recovered && healthLabel === 'coleta_continua' && !hasAnomaly) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.TELEMETRY_RECOVERY,
      equipment_id,
      signals: ['telemetry_health'],
      evidence: { telemetry_health_score: healthScore, health_label: healthLabel },
      severity: severityForEventType(EVENT_TYPES.TELEMETRY_RECOVERY),
      window,
      summary: 'Recuperação observada da qualidade de coleta (telemetria contínua).'
    });
    ev.event_confidence = computeEventConfidence(ev.evidence);
    events.push(ev);
  }

  if (alarmActive || anomalies.some((a) => a.signal === 'alarm_state')) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.ALARM_ESCALATION,
      equipment_id,
      signals: ['alarm_state', ...anomalySignals.filter((s) => s === 'alarm_state')],
      evidence: {
        alarm_active: alarmActive,
        alarm_count: snapshot.alarm_count,
        alarm_escalation: true
      },
      severity: severityForEventType(EVENT_TYPES.ALARM_ESCALATION),
      window,
      summary: 'Escalada de alarmes observada na janela de telemetria.'
    });
    ev.event_confidence = computeEventConfidence(ev.evidence, { attention_score: attentionScore });
    events.push(ev);
  }

  if (hasAnomaly && anomalySignals.length >= 1) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.SIGNAL_INSTABILITY,
      equipment_id,
      signals: anomalySignals,
      evidence: {
        anomaly: true,
        anomaly_classification: hasCriticalAnomaly ? 'critical_anomaly' : anomalies[0]?.classification,
        anomaly_count: anomalies.length
      },
      severity: hasCriticalAnomaly ? 'critical' : severityForEventType(EVENT_TYPES.SIGNAL_INSTABILITY),
      window,
      summary: `Instabilidade observada em ${anomalySignals.join(', ')}.`
    });
    ev.event_confidence = computeEventConfidence(ev.evidence, { attention_score: attentionScore });
    events.push(ev);
  }

  for (const corr of strongCorr) {
    const sigs = [corr.signal_a, corr.signal_b];
    const relatedAnomaly = anomalies.some((a) => sigs.includes(a.signal));
    const relatedTrend = trendChanges.some((t) => sigs.includes(t.signal));
    if (!relatedAnomaly && !relatedTrend && Number(corr.correlation) < 0.75) continue;

    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.CORRELATED_DEVIATION,
      equipment_id,
      signals: sigs,
      evidence: {
        correlation: corr.correlation,
        correlation_classification: corr.classification,
        trend: relatedTrend ? trendChanges.find((t) => sigs.includes(t.signal))?.trend : null,
        anomaly: relatedAnomaly
      },
      severity: severityForEventType(EVENT_TYPES.CORRELATED_DEVIATION),
      window: corr.window || window,
      summary: `Desvio correlacionado observado entre ${corr.signal_a} e ${corr.signal_b} (r=${corr.correlation}).`
    });
    ev.event_confidence = computeEventConfidence(ev.evidence, { attention_score: attentionScore });
    events.push(ev);
  }

  for (const tc of trendChanges) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.OBSERVED_OPERATIONAL_CHANGE,
      equipment_id,
      signals: [tc.signal],
      evidence: {
        trend: tc.trend,
        variation_percent: tc.variation_percent
      },
      severity: severityForEventType(EVENT_TYPES.OBSERVED_OPERATIONAL_CHANGE),
      window,
      summary: `Alteração operacional observada: ${tc.signal} ${tc.trend} (${tc.variation_percent}%).`
    });
    ev.event_confidence = computeEventConfidence(ev.evidence);
    events.push(ev);
  }

  if (attentionScore >= eventConfig.critical_attention_threshold || hasCriticalAnomaly) {
    const evType =
      attentionScore >= eventConfig.critical_attention_threshold
        ? EVENT_TYPES.EQUIPMENT_ATTENTION_CRITICAL
        : EVENT_TYPES.EQUIPMENT_ATTENTION_REQUIRED;
    const ev = buildOperationalEventEvidence({
      event_type: evType,
      equipment_id,
      signals: anomalySignals,
      evidence: {
        attention_score: attentionScore,
        attention_level: attention?.attention_level,
        anomaly: hasAnomaly
      },
      severity: severityForEventType(evType),
      window,
      summary: `Equipamento requer atenção observável (attention_score ${attentionScore}).`
    });
    ev.event_confidence = computeEventConfidence(ev.evidence, { attention_score: attentionScore });
    events.push(ev);
  } else if (attentionScore >= eventConfig.attention_threshold) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.EQUIPMENT_ATTENTION_REQUIRED,
      equipment_id,
      signals: anomalySignals,
      evidence: { attention_score: attentionScore, attention_level: attention?.attention_level },
      severity: severityForEventType(EVENT_TYPES.EQUIPMENT_ATTENTION_REQUIRED),
      window,
      summary: `Atenção operacional observável (score ${attentionScore}).`
    });
    ev.event_confidence = computeEventConfidence(ev.evidence, { attention_score: attentionScore });
    events.push(ev);
  }

  if (!events.length) {
    const ev = buildOperationalEventEvidence({
      event_type: EVENT_TYPES.NORMAL_OPERATION,
      equipment_id,
      signals: [],
      evidence: {
        telemetry_health_score: healthScore,
        equipment_active: snapshot.active_equipment_count > 0
      },
      severity: severityForEventType(EVENT_TYPES.NORMAL_OPERATION),
      window,
      summary: 'Operação observada dentro dos parâmetros de telemetria na janela analisada.'
    });
    ev.event_confidence = computeEventConfidence(ev.evidence);
    events.push(ev);
  }

  return events;
}

/**
 * Agrega packs 40–43 e detecta eventos.
 */
async function detectOperationalEvents(companyId, intelBundle = null) {
  if (!companyId) return [];

  const bundle = intelBundle || (await loadIntelligenceBundle(companyId));
  const allEvents = [];

  const attentionByEq = new Map(
    (bundle.anomaly?.equipment_attention || []).map((a) => [a.equipment_id, a])
  );
  const anomaliesByEq = new Map();
  for (const a of bundle.anomaly?.anomalies || []) {
    if (!anomaliesByEq.has(a.equipment_id)) anomaliesByEq.set(a.equipment_id, []);
    anomaliesByEq.get(a.equipment_id).push(a);
  }
  const corrByEq = new Map();
  for (const c of bundle.correlation?.correlation_pairs || []) {
    if (!corrByEq.has(c.equipment_id)) corrByEq.set(c.equipment_id, []);
    corrByEq.get(c.equipment_id).push(c);
  }
  const trendByEq = new Map(
    (bundle.trend?.trend_snapshot?.equipment || []).map((e) => [e.equipment_id, e])
  );
  const summaryByEq = new Map(
    (bundle.plc?.equipment_operational_summary || []).map((s) => [s.equipment_id, s])
  );

  const equipmentIds = new Set();
  for (const s of bundle.plc?.equipment_operational_summary || []) {
    equipmentIds.add(s.equipment_id);
  }
  for (const eq of bundle.trend?.trend_snapshot?.equipment || []) {
    equipmentIds.add(eq.equipment_id);
  }
  for (const id of [...anomaliesByEq.keys(), ...corrByEq.keys(), ...trendByEq.keys()]) {
    equipmentIds.add(id);
  }

  for (const eqId of equipmentIds) {
    if (eqId === 'unknown') continue;
    const summary = summaryByEq.get(eqId) || {};
    const snap = {
      ...bundle.plc?.snapshot,
      alarm_active: bundle.plc?.snapshot?.alarm_active,
      alarm_count: bundle.plc?.snapshot?.alarm_count,
      telemetry_health: bundle.plc?.snapshot?.telemetry_health,
      telemetry_coverage: summary.telemetry_coverage ?? bundle.plc?.snapshot?.telemetry_coverage,
      active_equipment_count: bundle.plc?.snapshot?.active_equipment_count
    };

    for (const window of eventConfig.windows) {
      const windowCorrelations = (corrByEq.get(eqId) || []).filter((c) => c.window === window);
      const eqEvents = detectOperationalEventsForEquipment({
        equipment_id: eqId,
        snapshot: snap,
        trendRow: trendByEq.get(eqId) || {},
        anomalies: anomaliesByEq.get(eqId) || [],
        correlations: windowCorrelations.length ? windowCorrelations : corrByEq.get(eqId) || [],
        attention: attentionByEq.get(eqId),
        window
      });
      allEvents.push(...eqEvents);
    }
  }

  return dedupeEvents(allEvents);
}

function dedupeEvents(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const key = `${e.equipment_id}|${e.event_type}|${e.window}|${(e.signals || []).join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => b.event_confidence - a.event_confidence);
}

async function loadIntelligenceBundle(companyId) {
  const plcIntel = require('./plcOperationalIntelligenceService');
  const plcTrend = require('./plcTrendAnalysisService');
  const plcAnomaly = require('./plcAnomalyAnalysisService');
  const plcCorrelation = require('./plcCorrelationAnalysisService');

  const [plc, trend, anomaly, correlation] = await Promise.all([
    plcIntel.buildPlcOperationalPack(companyId).catch(() => null),
    plcTrend.buildOperationalTrendPack(companyId).catch(() => null),
    plcAnomaly.buildOperationalAnomalyPack(companyId).catch(() => null),
    plcCorrelation.buildOperationalCorrelationPack(companyId).catch(() => null)
  ]);

  return { plc, trend, anomaly, correlation };
}

/**
 * 44-F — Timeline por janela.
 */
function buildOperationalTimeline(events = []) {
  const timeline = { '24h': [], '7d': [], '30d': [] };
  for (const ev of events) {
    const w = ev.window || '24h';
    if (timeline[w]) timeline[w].push(ev);
  }
  for (const w of Object.keys(timeline)) {
    timeline[w].sort(
      (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
    );
  }
  return {
    windows: eventConfig.windows,
    timeline,
    event_count: events.length,
    generated_at: new Date().toISOString()
  };
}

async function buildOperationalEventPack(companyId) {
  if (!companyId) {
    return {
      events: [],
      timeline: buildOperationalTimeline([]),
      source_table: 'plc_collected_data'
    };
  }

  const bundle = await loadIntelligenceBundle(companyId);
  const events = await detectOperationalEvents(companyId, bundle);
  const timeline = buildOperationalTimeline(events);

  return {
    events,
    timeline,
    intelligence_bundle: {
      has_plc: !!bundle.plc?.snapshot,
      has_trend: !!(bundle.trend?.trend_snapshot?.equipment?.length),
      has_anomaly: !!(bundle.anomaly?.anomalies?.length),
      has_correlation: !!(bundle.correlation?.correlation_pairs?.length)
    },
    event_count: events.length,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function collectEventEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    evidence.add(String(Number(n)));
    evidence.add(String(Math.round(Number(n))));
  };
  for (const e of pack.events || []) {
    add(e.event_confidence);
    const ev = e.evidence || {};
    add(ev.correlation);
    add(ev.variation_percent);
    add(ev.attention_score);
    add(ev.telemetry_health_score);
    add(ev.anomaly_count);
  }
  return evidence;
}

function formatEventsForChat(pack = {}) {
  const events = (pack.events || []).filter(
    (e) => e.event_type !== EVENT_TYPES.NORMAL_OPERATION
  );
  if (!events.length && !(pack.events || []).length) return '';

  const show = events.length ? events.slice(0, 10) : (pack.events || []).slice(0, 3);
  const lines = [
    'Eventos operacionais observáveis (NÃO prever falha/parada/causa raiz):',
    `- Total eventos na análise: ${pack.event_count ?? show.length}`
  ];

  for (const e of show) {
    lines.push(
      `  • [${e.window}] ${e.equipment_id} — ${e.event_type} (${e.severity}, conf=${e.event_confidence}): ${e.summary || '—'}`
    );
  }

  const tl24 = pack.timeline?.timeline?.['24h']?.length ?? 0;
  if (tl24) lines.push(`- Timeline 24h: ${tl24} evento(s) registado(s).`);

  return lines.join('\n');
}

function buildLiveFeedEvents(eventPack = {}) {
  const events = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const candidates = (eventPack.events || [])
    .filter((e) => e.event_type !== EVENT_TYPES.NORMAL_OPERATION)
    .sort((a, b) => b.event_confidence - a.event_confidence)
    .slice(0, eventConfig.feed.max_events);

  for (const e of candidates) {
    let feedType = 'OPERATIONAL_EVENT_DETECTED';
    if (e.severity === 'critical' || e.event_type === EVENT_TYPES.ALARM_ESCALATION) {
      feedType = 'OPERATIONAL_EVENT_ESCALATED';
    }
    if (
      e.event_type === EVENT_TYPES.TELEMETRY_RECOVERY ||
      e.event_type === EVENT_TYPES.NORMAL_OPERATION
    ) {
      feedType = 'OPERATIONAL_EVENT_RESOLVED';
    }
    if (e.event_type === EVENT_TYPES.OBSERVED_OPERATIONAL_CHANGE) {
      feedType = 'OBSERVED_OPERATIONAL_CHANGE';
    }

    const sev =
      e.severity === 'critical' ? 'high' : e.severity === 'warning' ? 'medium' : 'low';

    events.push({
      id: `plc-ev-${e.equipment_id}-${e.event_type}-${now.getTime()}`,
      time: timeStr,
      severity: sev,
      type: feedType,
      message: `[PLC] ${e.summary || e.event_type}`,
      source_table: 'plc_collected_data',
      audit_evidence: e,
      verification_state: 'plc_observed'
    });
  }

  return events;
}

module.exports = {
  EVENT_TYPES,
  buildOperationalEventEvidence,
  computeEventConfidence,
  detectOperationalEvents,
  detectOperationalEventsForEquipment,
  buildOperationalTimeline,
  buildOperationalEventPack,
  loadIntelligenceBundle,
  collectEventEvidenceNumbers,
  formatEventsForChat,
  buildLiveFeedEvents
};
