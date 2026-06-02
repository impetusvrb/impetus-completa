'use strict';

/**
 * FASE 45 — Padrões operacionais recorrentes (consolida eventos F44, sem ML/previsão/causalidade).
 */
const patternConfig = require('../config/patternIntelligenceConfig');

const PATTERN_TYPES = {
  RECURRING_SIGNAL_INSTABILITY: 'RECURRING_SIGNAL_INSTABILITY',
  RECURRING_ALARM_ESCALATION: 'RECURRING_ALARM_ESCALATION',
  RECURRING_CORRELATED_DEVIATION: 'RECURRING_CORRELATED_DEVIATION',
  RECURRING_TELEMETRY_DEGRADATION: 'RECURRING_TELEMETRY_DEGRADATION',
  RECURRING_ATTENTION_EVENT: 'RECURRING_ATTENTION_EVENT',
  STABLE_OPERATION_PATTERN: 'STABLE_OPERATION_PATTERN',
  OBSERVED_REPETITIVE_BEHAVIOR: 'OBSERVED_REPETITIVE_BEHAVIOR'
};

const EVENT_TO_PATTERN = {
  SIGNAL_INSTABILITY: PATTERN_TYPES.RECURRING_SIGNAL_INSTABILITY,
  ALARM_ESCALATION: PATTERN_TYPES.RECURRING_ALARM_ESCALATION,
  CORRELATED_DEVIATION: PATTERN_TYPES.RECURRING_CORRELATED_DEVIATION,
  TELEMETRY_DEGRADATION: PATTERN_TYPES.RECURRING_TELEMETRY_DEGRADATION,
  EQUIPMENT_ATTENTION_REQUIRED: PATTERN_TYPES.RECURRING_ATTENTION_EVENT,
  EQUIPMENT_ATTENTION_CRITICAL: PATTERN_TYPES.RECURRING_ATTENTION_EVENT,
  NORMAL_OPERATION: PATTERN_TYPES.STABLE_OPERATION_PATTERN,
  OBSERVED_OPERATIONAL_CHANGE: PATTERN_TYPES.OBSERVED_REPETITIVE_BEHAVIOR
};

const SEVERITY_RANK = { informational: 0, attention: 1, warning: 2, critical: 3 };

function buildPatternEvidence({
  pattern_type,
  equipment_id,
  occurrences = 0,
  windows = [],
  signals = [],
  evidence = {},
  severity = 'informational',
  pattern_confidence = 0,
  observed_pattern = true,
  summary = null
}) {
  return {
    pattern_type: String(pattern_type),
    equipment_id: String(equipment_id),
    occurrences: Math.max(0, Math.round(occurrences)),
    windows: [...windows],
    signals: [...signals],
    evidence: {
      ...evidence,
      observed_pattern: observed_pattern === true,
      no_prediction: true,
      no_causality_inferred: true
    },
    severity,
    pattern_confidence: Math.min(100, Math.max(0, Math.round(pattern_confidence))),
    observed_pattern: observed_pattern === true,
    summary: summary || null,
    observed_at: new Date().toISOString(),
    source_table: 'plc_collected_data'
  };
}

function computePatternConfidence(pattern = {}) {
  const cfg = patternConfig.pattern_confidence;
  let score = cfg.base;
  const occ = pattern.occurrences ?? 0;
  const winCount = (pattern.windows || []).length;

  score += Math.min(40, occ * cfg.per_occurrence);
  if (winCount >= patternConfig.min_windows_multi_bonus) {
    score += winCount * cfg.per_window;
  }
  if (pattern.evidence?.severity_consistent === true) {
    score += cfg.severity_consistency_bonus;
  }

  return Math.min(cfg.max_score, Math.max(0, Math.round(score)));
}

function severityForPattern(patternType, occurrences = 0, avgSeverityRank = 0) {
  let base = patternConfig.severity_map[patternType] || 'informational';
  const freq = patternConfig.severity_by_frequency;
  if (occurrences > freq.medium_max) base = 'critical';
  else if (occurrences > freq.low_max) base = 'warning';
  if (avgSeverityRank >= 2.5 && base !== 'critical') base = 'critical';
  else if (avgSeverityRank >= 1.5 && base === 'informational') base = 'attention';
  return base;
}

function collectSignalsFromEvents(evs = []) {
  const sigs = new Set();
  for (const e of evs) {
    for (const s of e.signals || []) sigs.add(s);
  }
  return [...sigs];
}

/**
 * 45-B — Detecção determinística a partir de eventos F44.
 */
function detectOperationalPatternsFromEvents(events = []) {
  if (!Array.isArray(events) || !events.length) return [];

  const groups = new Map();
  for (const ev of events) {
    const patternType = EVENT_TO_PATTERN[ev.event_type];
    if (!patternType) continue;
    const eq = ev.equipment_id || 'unknown';
    if (eq === 'unknown') continue;
    const key = `${eq}|${patternType}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  }

  const patterns = [];
  for (const [, evs] of groups) {
    const equipment_id = evs[0].equipment_id;
    const pattern_type = EVENT_TO_PATTERN[evs[0].event_type];
    const windows = [...new Set(evs.map((e) => e.window).filter(Boolean))].sort();
    const occurrences = evs.length;

    const minOcc =
      pattern_type === PATTERN_TYPES.STABLE_OPERATION_PATTERN
        ? patternConfig.min_occurrences_stable
        : patternConfig.min_occurrences_recurring;

    const observed_pattern = occurrences >= minOcc;
    if (!observed_pattern) continue;

    const ranks = evs.map((e) => SEVERITY_RANK[e.severity] ?? 0);
    const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const severityConsistent = ranks.every((r) => r === ranks[0]);

    const severity = severityForPattern(pattern_type, occurrences, avgRank);
    const signals = collectSignalsFromEvents(evs);

    const summaryByType = {
      [PATTERN_TYPES.RECURRING_SIGNAL_INSTABILITY]: `Padrão recorrente de instabilidade de sinal (${occurrences} ocorrências).`,
      [PATTERN_TYPES.RECURRING_ALARM_ESCALATION]: `Padrão recorrente de escalada de alarmes (${occurrences} ocorrências).`,
      [PATTERN_TYPES.RECURRING_CORRELATED_DEVIATION]: `Padrão recorrente de desvio correlacionado (${occurrences} ocorrências).`,
      [PATTERN_TYPES.RECURRING_TELEMETRY_DEGRADATION]: `Padrão recorrente de degradação de telemetria (${occurrences} ocorrências).`,
      [PATTERN_TYPES.RECURRING_ATTENTION_EVENT]: `Padrão recorrente de eventos de atenção (${occurrences} ocorrências).`,
      [PATTERN_TYPES.STABLE_OPERATION_PATTERN]: `Padrão de operação estável observado (${occurrences} ocorrências).`,
      [PATTERN_TYPES.OBSERVED_REPETITIVE_BEHAVIOR]: `Comportamento operacional repetitivo observado (${occurrences} ocorrências).`
    };

    const pattern = buildPatternEvidence({
      pattern_type,
      equipment_id,
      occurrences,
      windows,
      signals,
      evidence: {
        event_types: [...new Set(evs.map((e) => e.event_type))],
        severity_consistent: severityConsistent,
        mean_event_confidence:
          evs.reduce((s, e) => s + (e.event_confidence || 0), 0) / occurrences
      },
      severity,
      observed_pattern: true,
      summary: summaryByType[pattern_type] || `Padrão ${pattern_type} observado.`
    });
    pattern.pattern_confidence = computePatternConfidence(pattern);
    patterns.push(pattern);
  }

  return patterns.sort((a, b) => b.pattern_confidence - a.pattern_confidence);
}

async function detectOperationalPatterns(companyId, eventPack = null) {
  if (!companyId) return [];
  const pack =
    eventPack || (await require('./operationalEventIntelligenceService').buildOperationalEventPack(companyId));
  return detectOperationalPatternsFromEvents(pack.events || []);
}

/**
 * 45-G — Histórico auditável por janela.
 */
function buildOperationalPatternHistory(patterns = [], events = []) {
  const history = { '24h': [], '7d': [], '30d': [], '90d': [] };

  for (const p of patterns) {
    if (!p.observed_pattern) continue;
    for (const w of p.windows || []) {
      if (history[w]) history[w].push(p);
    }
    history['90d'].push(p);
  }

  for (const w of patternConfig.history_windows) {
    history[w].sort((a, b) => b.pattern_confidence - a.pattern_confidence);
  }

  const isolated_events = [];
  const grouped = new Map();
  for (const e of events || []) {
    const pt = EVENT_TO_PATTERN[e.event_type];
    if (!pt) continue;
    const key = `${e.equipment_id}|${pt}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(e);
  }
  for (const [, evs] of grouped) {
    if (evs.length === 1) {
      isolated_events.push({
        equipment_id: evs[0].equipment_id,
        event_type: evs[0].event_type,
        window: evs[0].window,
        isolated: true
      });
    }
  }

  return {
    windows: patternConfig.history_windows,
    history,
    isolated_events,
    pattern_count: patterns.filter((p) => p.observed_pattern).length,
    generated_at: new Date().toISOString()
  };
}

async function buildOperationalPatternPack(companyId) {
  if (!companyId) {
    return {
      patterns: [],
      history: buildOperationalPatternHistory([], []),
      pattern_count: 0,
      source_table: 'plc_collected_data'
    };
  }

  const operationalEvents = require('./operationalEventIntelligenceService');
  const eventPack = await operationalEvents.buildOperationalEventPack(companyId);
  const patterns = detectOperationalPatternsFromEvents(eventPack.events || []);
  const history = buildOperationalPatternHistory(patterns, eventPack.events || []);

  return {
    patterns,
    history,
    event_reference: {
      event_count: eventPack.event_count ?? 0,
      has_events: (eventPack.events?.length ?? 0) > 0
    },
    pattern_count: patterns.filter((p) => p.observed_pattern).length,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function collectPatternEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    evidence.add(String(Number(n)));
    evidence.add(String(Math.round(Number(n))));
  };
  for (const p of pack.patterns || []) {
    add(p.occurrences);
    add(p.pattern_confidence);
    add(p.evidence?.mean_event_confidence);
  }
  return evidence;
}

function formatPatternsForChat(pack = {}) {
  const patterns = (pack.patterns || []).filter((p) => p.observed_pattern);
  if (!patterns.length) {
    if ((pack.event_reference?.event_count ?? 0) > 0) {
      return [
        'Padrões operacionais (NÃO prever repetição futura / causa raiz):',
        '- Nenhum padrão recorrente confirmado nas janelas (eventos podem ser isolados).'
      ].join('\n');
    }
    return '';
  }

  const lines = [
    'Padrões operacionais recorrentes observados (NÃO prever que voltará a ocorrer / vai piorar):',
    `- Total padrões confirmados: ${pack.pattern_count ?? patterns.length}`
  ];

  for (const p of patterns.slice(0, 8)) {
    lines.push(
      `  • ${p.equipment_id} — ${p.pattern_type} (${p.severity}, conf=${p.pattern_confidence}, ocorr=${p.occurrences}, janelas=${(p.windows || []).join('/')})`
    );
    if (p.summary) lines.push(`    ${p.summary}`);
  }

  const hist24 = pack.history?.history?.['24h']?.length ?? 0;
  if (hist24) lines.push(`- Histórico 24h: ${hist24} padrão(ões) registado(s).`);

  return lines.join('\n');
}

function buildLiveFeedPatterns(patternPack = {}) {
  const events = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const candidates = (patternPack.patterns || [])
    .filter((p) => p.observed_pattern)
    .sort((a, b) => b.pattern_confidence - a.pattern_confidence)
    .slice(0, patternConfig.feed.max_patterns);

  for (const p of candidates) {
    let feedType = 'PATTERN_DETECTED';
    if (p.severity === 'critical' || p.severity === 'warning') {
      feedType = 'PATTERN_ESCALATED';
    }
    if (p.pattern_type === PATTERN_TYPES.STABLE_OPERATION_PATTERN) {
      feedType = 'PATTERN_STABLE';
    }
    if (
      p.pattern_type === PATTERN_TYPES.OBSERVED_REPETITIVE_BEHAVIOR ||
      p.occurrences >= patternConfig.min_occurrences_recurring + 1
    ) {
      feedType = 'RECURRING_BEHAVIOR_OBSERVED';
    }

    const sev =
      p.severity === 'critical' ? 'high' : p.severity === 'warning' ? 'medium' : 'low';

    events.push({
      id: `plc-pat-${p.equipment_id}-${p.pattern_type}-${now.getTime()}`,
      time: timeStr,
      severity: sev,
      type: feedType,
      message: `[PLC] ${p.summary || p.pattern_type}`,
      source_table: 'plc_collected_data',
      audit_evidence: p,
      verification_state: 'plc_observed'
    });
  }

  return events;
}

module.exports = {
  PATTERN_TYPES,
  buildPatternEvidence,
  computePatternConfidence,
  detectOperationalPatterns,
  detectOperationalPatternsFromEvents,
  buildOperationalPatternHistory,
  buildOperationalPatternPack,
  collectPatternEvidenceNumbers,
  formatPatternsForChat,
  buildLiveFeedPatterns
};
