'use strict';

/**
 * FASE 47 — Priorização operacional observável (F40–46 → fila auditável, sem previsão).
 */
const priorityConfig = require('../config/priorityIntelligenceConfig');

function priorityLevelFromScore(score) {
  const s = Number(score) || 0;
  const lv = priorityConfig.levels;
  if (s > lv.high_max) return 'critical';
  if (s > lv.medium_max) return 'high';
  if (s > lv.low_max) return 'medium';
  return 'low';
}

/**
 * 47-B — Score 0–100 com pesos documentados em priorityIntelligenceConfig.
 */
function computePriorityScore(components = {}) {
  const w = priorityConfig.weights;
  const attention = Math.min(100, Math.max(0, Number(components.attention_score) || 0));
  const risk = Math.min(100, Math.max(0, Number(components.risk_score) || 0));
  const eventConf = Math.min(100, Math.max(0, Number(components.event_confidence) || 0));
  const patternConf = Math.min(100, Math.max(0, Number(components.pattern_confidence) || 0));
  const health = Math.min(100, Math.max(0, Number(components.telemetry_health) ?? 100));
  const telemetryUrgency = 100 - health;

  const weighted =
    w.attention_score * attention +
    w.risk_score * risk +
    w.event_confidence * eventConf +
    w.pattern_confidence * patternConf +
    w.telemetry_health * telemetryUrgency;

  const score = Math.round(Math.min(100, Math.max(0, weighted)));
  const contributors = [];
  if (attention > 0) contributors.push('attention_score');
  if (risk > 0) contributors.push('risk_score');
  if (eventConf > 0) contributors.push('event_confidence');
  if (patternConf > 0) contributors.push('pattern_confidence');
  if (telemetryUrgency > 0) contributors.push('telemetry_health');

  return {
    priority_score: score,
    priority_level: priorityLevelFromScore(score),
    contributors,
    traceability: {
      attention_score: attention,
      risk_score: risk,
      event_confidence: eventConf,
      pattern_confidence: patternConf,
      telemetry_health: health,
      telemetry_urgency_component: telemetryUrgency,
      weights_applied: { ...w }
    }
  };
}

function buildPriorityEvidence({
  entity_type = 'equipment',
  entity_id,
  equipment_id = null,
  priority_score = 0,
  priority_level = 'low',
  contributors = [],
  traceability = {},
  rank = null
}) {
  return {
    entity_type: String(entity_type),
    entity_id: String(entity_id),
    equipment_id: equipment_id ? String(equipment_id) : null,
    priority_score: Math.min(100, Math.max(0, Math.round(priority_score))),
    priority_level,
    contributors: [...contributors],
    traceability: { ...traceability },
    rank,
    observational_only: true,
    no_prediction: true,
    no_causality: true,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function aggregateEquipmentComponents(equipmentId, bundle = {}) {
  const attention =
    (bundle.anomaly?.equipment_attention || []).find((a) => a.equipment_id === equipmentId)
      ?.attention_score ?? 0;
  const risk =
    (bundle.trend?.equipment_risk || []).find((r) => r.equipment_id === equipmentId)?.risk_score ?? 0;

  const eqEvents = (bundle.event_pack?.events || []).filter(
    (e) => e.equipment_id === equipmentId && e.event_type !== 'NORMAL_OPERATION'
  );
  const event_confidence = eqEvents.reduce(
    (m, e) => Math.max(m, Number(e.event_confidence) || 0),
    0
  );

  const eqPatterns = (bundle.pattern_pack?.patterns || []).filter(
    (p) => p.equipment_id === equipmentId && p.observed_pattern
  );
  const pattern_confidence = eqPatterns.reduce(
    (m, p) => Math.max(m, Number(p.pattern_confidence) || 0),
    0
  );

  const summary = (bundle.plc?.equipment_operational_summary || []).find(
    (s) => s.equipment_id === equipmentId
  );
  const telemetry_health =
    summary?.telemetry_health_score ??
    bundle.plc?.snapshot?.telemetry_health?.score ??
    100;

  return {
    attention_score: attention,
    risk_score: risk,
    event_confidence,
    pattern_confidence,
    telemetry_health
  };
}

function prioritizeEquipment(bundle = {}) {
  const ids = new Set();
  for (const s of bundle.plc?.equipment_operational_summary || []) {
    if (s.equipment_id) ids.add(s.equipment_id);
  }
  for (const a of bundle.anomaly?.equipment_attention || []) {
    if (a.equipment_id) ids.add(a.equipment_id);
  }
  for (const e of bundle.event_pack?.events || []) {
    if (e.equipment_id && e.equipment_id !== 'unknown') ids.add(e.equipment_id);
  }
  for (const p of bundle.pattern_pack?.patterns || []) {
    if (p.equipment_id) ids.add(p.equipment_id);
  }

  const ranked = [];
  for (const eqId of ids) {
    const components = aggregateEquipmentComponents(eqId, bundle);
    const computed = computePriorityScore(components);
    ranked.push(
      buildPriorityEvidence({
        entity_type: 'equipment',
        entity_id: eqId,
        equipment_id: eqId,
        priority_score: computed.priority_score,
        priority_level: computed.priority_level,
        contributors: computed.contributors,
        traceability: computed.traceability
      })
    );
  }

  ranked.sort((a, b) => b.priority_score - a.priority_score);
  ranked.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return ranked;
}

function prioritizeEvents(bundle = {}) {
  const events = (bundle.event_pack?.events || []).filter(
    (e) => e.event_type !== 'NORMAL_OPERATION'
  );
  const ranked = events.map((ev) => {
    const components = aggregateEquipmentComponents(ev.equipment_id, bundle);
    const merged = {
      ...components,
      event_confidence: Math.max(components.event_confidence, Number(ev.event_confidence) || 0)
    };
    const computed = computePriorityScore(merged);
    return buildPriorityEvidence({
      entity_type: 'event',
      entity_id: `${ev.event_type}|${ev.window}`,
      equipment_id: ev.equipment_id,
      priority_score: computed.priority_score,
      priority_level: computed.priority_level,
      contributors: computed.contributors,
      traceability: { ...computed.traceability, event_type: ev.event_type, window: ev.window }
    });
  });

  ranked.sort((a, b) => b.priority_score - a.priority_score);
  ranked.forEach((item, idx) => {
    item.rank = idx + 1;
  });
  return ranked.slice(0, priorityConfig.queue.max_events);
}

function prioritizePatterns(bundle = {}) {
  const patterns = (bundle.pattern_pack?.patterns || []).filter((p) => p.observed_pattern);
  const ranked = patterns.map((pat) => {
    const components = aggregateEquipmentComponents(pat.equipment_id, bundle);
    const merged = {
      ...components,
      pattern_confidence: Math.max(
        components.pattern_confidence,
        Number(pat.pattern_confidence) || 0
      )
    };
    const computed = computePriorityScore(merged);
    return buildPriorityEvidence({
      entity_type: 'pattern',
      entity_id: pat.pattern_type,
      equipment_id: pat.equipment_id,
      priority_score: computed.priority_score,
      priority_level: computed.priority_level,
      contributors: computed.contributors,
      traceability: {
        ...computed.traceability,
        occurrences: pat.occurrences,
        windows: pat.windows
      }
    });
  });

  ranked.sort((a, b) => b.priority_score - a.priority_score);
  ranked.forEach((item, idx) => {
    item.rank = idx + 1;
  });
  return ranked.slice(0, priorityConfig.queue.max_patterns);
}

/**
 * 47-F — Fila operacional (equipment priority_score DESC).
 */
function buildOperationalPriorityQueue(equipmentRanked = []) {
  const queue = equipmentRanked
    .slice(0, priorityConfig.queue.max_equipment)
    .map((item, idx) => ({
      position: idx + 1,
      equipment_id: item.equipment_id,
      priority_score: item.priority_score,
      priority_level: item.priority_level,
      contributors: item.contributors,
      traceability: item.traceability
    }));

  return {
    queue,
    top_equipment_id: queue[0]?.equipment_id ?? null,
    queue_length: queue.length,
    ordering: 'priority_score_desc',
    generated_at: new Date().toISOString()
  };
}

async function loadIntelligenceBundle(companyId) {
  const operationalExplanation = require('./operationalExplanationService');
  return operationalExplanation.loadIntelligenceBundle(companyId);
}

async function buildOperationalPriorityPack(companyId) {
  if (!companyId) {
    return {
      equipment_ranking: [],
      event_ranking: [],
      pattern_ranking: [],
      priority_queue: buildOperationalPriorityQueue([]),
      priority_count: 0,
      source_table: 'plc_collected_data'
    };
  }

  const bundle = await loadIntelligenceBundle(companyId);
  const equipment_ranking = prioritizeEquipment(bundle);
  const event_ranking = prioritizeEvents(bundle);
  const pattern_ranking = prioritizePatterns(bundle);
  const priority_queue = buildOperationalPriorityQueue(equipment_ranking);

  return {
    equipment_ranking,
    event_ranking,
    pattern_ranking,
    priority_queue,
    weights_documented: { ...priorityConfig.weights },
    level_thresholds: { ...priorityConfig.levels },
    top_priority: equipment_ranking[0] || null,
    priority_count: equipment_ranking.length,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function collectPriorityEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    evidence.add(String(Number(n)));
    evidence.add(String(Math.round(Number(n))));
  };
  const items = [
    ...(pack.equipment_ranking || []),
    ...(pack.event_ranking || []),
    ...(pack.pattern_ranking || [])
  ];
  for (const item of items) {
    add(item.priority_score);
    add(item.rank);
    const tr = item.traceability || {};
    add(tr.attention_score);
    add(tr.risk_score);
    add(tr.event_confidence);
    add(tr.pattern_confidence);
    add(tr.telemetry_health);
  }
  return evidence;
}

function formatPrioritiesForChat(pack = {}) {
  const queue = pack.priority_queue?.queue || [];
  if (!queue.length) return '';

  const lines = [
    'Priorização operacional observável (NÃO “vai falhar” / “mais perigoso” / “crítico da planta”):',
    `- Pesos explícitos: attention=${priorityConfig.weights.attention_score}, risk=${priorityConfig.weights.risk_score}, event=${priorityConfig.weights.event_confidence}, pattern=${priorityConfig.weights.pattern_confidence}, telemetria=${priorityConfig.weights.telemetry_health}`,
    `- Fila (priority_score DESC):`
  ];

  for (const q of queue.slice(0, 8)) {
    lines.push(
      `  ${q.position}º ${q.equipment_id} — score=${q.priority_score} (${q.priority_level}) [${(q.contributors || []).join(', ')}]`
    );
  }

  const topEvent = (pack.event_ranking || [])[0];
  if (topEvent) {
    lines.push(
      `- Evento com maior prioridade observável: ${topEvent.entity_id} em ${topEvent.equipment_id} (score=${topEvent.priority_score})`
    );
  }
  const topPattern = (pack.pattern_ranking || [])[0];
  if (topPattern) {
    lines.push(
      `- Padrão com maior prioridade observável: ${topPattern.entity_id} em ${topPattern.equipment_id} (score=${topPattern.priority_score})`
    );
  }

  return lines.join('\n');
}

function buildLiveFeedPriorities(priorityPack = {}, previousTopId = null) {
  const events = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const top = priorityPack.top_priority || priorityPack.equipment_ranking?.[0];

  if (!top) return events;

  const feedType =
    previousTopId && previousTopId !== top.equipment_id
      ? 'PRIORITY_CHANGED'
      : 'OPERATIONAL_PRIORITY_IDENTIFIED';

  events.push({
    id: `plc-pri-${top.equipment_id}-${now.getTime()}`,
    time: timeStr,
    severity: top.priority_level === 'critical' ? 'high' : top.priority_level === 'high' ? 'medium' : 'low',
    type: feedType,
    message: `[PLC] Prioridade observável: ${top.equipment_id} (score=${top.priority_score}, ${top.priority_level})`,
    source_table: 'plc_collected_data',
    audit_evidence: top,
    verification_state: 'plc_observed'
  });

  if (top.priority_level === 'high' || top.priority_level === 'critical') {
    events.push({
      id: `plc-pri-up-${top.equipment_id}-${now.getTime()}`,
      time: timeStr,
      severity: 'medium',
      type: 'PRIORITY_ELEVATED',
      message: `[PLC] Prioridade elevada observada: ${top.equipment_id}`,
      source_table: 'plc_collected_data',
      audit_evidence: top,
      verification_state: 'plc_observed'
    });
  }

  const lowItems = (priorityPack.equipment_ranking || []).filter((e) => e.priority_level === 'low');
  if (lowItems.length && top.priority_score >= priorityConfig.levels.medium_max) {
    events.push({
      id: `plc-pri-low-${now.getTime()}`,
      time: timeStr,
      severity: 'low',
      type: 'PRIORITY_REDUCED',
      message: `[PLC] ${lowItems.length} equipamento(s) com prioridade observável baixa na fila.`,
      source_table: 'plc_collected_data',
      audit_evidence: { count: lowItems.length },
      verification_state: 'plc_observed'
    });
  }

  return events.slice(0, priorityConfig.feed.max_items);
}

module.exports = {
  computePriorityScore,
  priorityLevelFromScore,
  buildPriorityEvidence,
  prioritizeEquipment,
  prioritizeEvents,
  prioritizePatterns,
  buildOperationalPriorityQueue,
  buildOperationalPriorityPack,
  loadIntelligenceBundle,
  collectPriorityEvidenceNumbers,
  formatPrioritiesForChat,
  buildLiveFeedPriorities
};
