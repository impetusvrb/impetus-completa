'use strict';

/**
 * FASE 39/40 — Grounding PLC para dashboard chat (mínimo + inteligência operacional auditável).
 */
const db = require('../db');
const plcOperationalIntelligence = require('./plcOperationalIntelligenceService');

const PLC_WINDOW_HOURS = 24;
const MAX_EQUIPMENT_IDS = 20;

/**
 * Contagem rápida para classify data_state.
 * @returns {{ distinct_equipment: number, last_collected_at: string|null }}
 */
async function countDistinctPlcEquipment(companyId, windowHours = PLC_WINDOW_HOURS) {
  if (!companyId) {
    return { distinct_equipment: 0, last_collected_at: null };
  }
  try {
    const r = await db.query(
      `SELECT COUNT(DISTINCT equipment_id)::int AS c,
              MAX(collected_at) AS last_at
       FROM plc_collected_data
       WHERE company_id = $1
         AND equipment_id IS NOT NULL
         AND TRIM(equipment_id::text) <> ''
         AND collected_at > NOW() - INTERVAL '1 hour' * $2`,
      [companyId, Math.max(1, Number(windowHours) || PLC_WINDOW_HOURS)]
    );
    return {
      distinct_equipment: r.rows[0]?.c ?? 0,
      last_collected_at: r.rows[0]?.last_at ? new Date(r.rows[0].last_at).toISOString() : null
    };
  } catch (e) {
    console.warn('[PLC_CHAT_GROUNDING][count]', e?.message || e);
    return { distinct_equipment: 0, last_collected_at: null };
  }
}

/**
 * Pacote FASE 40 — snapshot + resumos por equipamento + saúde telemetria.
 */
async function fetchPlcOperationalIntelligencePack(companyId, windowHours = PLC_WINDOW_HOURS) {
  return plcOperationalIntelligence.buildPlcOperationalPack(companyId, windowHours);
}

/**
 * Snapshot mínimo para inject no turno do utilizador (sem percentagens / OEE).
 * Enriquecido com campos FASE 40 quando disponíveis.
 */
async function fetchMinimalPlcGroundingSummary(companyId) {
  if (!companyId) {
    return {
      equipment_count: 0,
      last_collection_at: null,
      active_equipment_ids: [],
      alarm_summary: [],
      plc_intelligence: null
    };
  }
  try {
    const plcTrend = require('./plcTrendAnalysisService');
    const plcAnomaly = require('./plcAnomalyAnalysisService');
    const plcCorrelation = require('./plcCorrelationAnalysisService');
    const operationalEvents = require('./operationalEventIntelligenceService');
    const operationalPatterns = require('./operationalPatternIntelligenceService');
    const operationalExplanation = require('./operationalExplanationService');
    const operationalPrioritization = require('./operationalPrioritizationService');
    const [
      pack,
      trend_pack,
      anomaly_pack,
      correlation_pack,
      event_pack,
      pattern_pack,
      explanation_pack,
      priority_pack
    ] = await Promise.all([
      fetchPlcOperationalIntelligencePack(companyId).catch(() => null),
      plcTrend.buildOperationalTrendPack(companyId).catch(() => null),
      plcAnomaly.buildOperationalAnomalyPack(companyId).catch(() => null),
      plcCorrelation.buildOperationalCorrelationPack(companyId).catch(() => null),
      operationalEvents.buildOperationalEventPack(companyId).catch(() => null),
      operationalPatterns.buildOperationalPatternPack(companyId).catch(() => null),
      operationalExplanation.buildOperationalExplanationPack(companyId).catch(() => null),
      operationalPrioritization.buildOperationalPriorityPack(companyId).catch(() => null)
    ]);
    if (pack && trend_pack) pack.trend_pack = trend_pack;
    if (pack && anomaly_pack) pack.anomaly_pack = anomaly_pack;
    if (pack && correlation_pack) pack.correlation_pack = correlation_pack;
    if (pack && event_pack) pack.event_pack = event_pack;
    if (pack && pattern_pack) pack.pattern_pack = pattern_pack;
    if (pack && explanation_pack) pack.explanation_pack = explanation_pack;
    if (pack && priority_pack) pack.priority_pack = priority_pack;
    const [eqRes, alarmRes, lastRes] = await Promise.all([
      db.query(
        `SELECT DISTINCT ON (equipment_id)
                equipment_id,
                COALESCE(NULLIF(TRIM(equipment_name), ''), equipment_id) AS equipment_name
         FROM plc_collected_data
         WHERE company_id = $1
           AND equipment_id IS NOT NULL
           AND collected_at > NOW() - INTERVAL '1 hour' * $2
         ORDER BY equipment_id, collected_at DESC
         LIMIT $3`,
        [companyId, PLC_WINDOW_HOURS, MAX_EQUIPMENT_IDS]
      ),
      db.query(
        `SELECT COALESCE(alarm_state, 'unknown') AS alarm_state,
                COUNT(*)::int AS c
         FROM plc_collected_data
         WHERE company_id = $1
           AND collected_at > NOW() - INTERVAL '1 hour' * $2
         GROUP BY COALESCE(alarm_state, 'unknown')
         ORDER BY c DESC`,
        [companyId, PLC_WINDOW_HOURS]
      ),
      db.query(
        `SELECT MAX(collected_at) AS last_at
         FROM plc_collected_data
         WHERE company_id = $1`,
        [companyId]
      )
    ]);

    const snap = pack?.snapshot;
    const summaries = pack?.equipment_operational_summary || [];

    return {
      equipment_count: snap?.equipment_count ?? eqRes.rows.length,
      active_equipment_count: snap?.active_equipment_count ?? 0,
      last_collection_at:
        snap?.last_collection_at ||
        (lastRes.rows[0]?.last_at ? new Date(lastRes.rows[0].last_at).toISOString() : null),
      runtime_hours: snap?.runtime_hours ?? 0,
      telemetry_health: snap?.telemetry_health ?? null,
      telemetry_coverage: snap?.telemetry_coverage ?? 0,
      alarm_count: snap?.alarm_count ?? 0,
      alarm_active: snap?.alarm_active ?? false,
      active_equipment_ids: (summaries.length ? summaries : eqRes.rows).map((row) => ({
        id: String(row.equipment_id),
        name: String(row.equipment_name || row.equipment_id),
        is_active_recent: row.is_active_recent !== false
      })),
      alarm_summary: (alarmRes.rows || []).map((row) => ({
        state: String(row.alarm_state || 'unknown'),
        count: Number(row.c) || 0
      })),
      equipment_operational_summary: summaries,
      plc_intelligence: pack,
      trend_pack: trend_pack || pack?.trend_pack || null,
      anomaly_pack: anomaly_pack || pack?.anomaly_pack || null,
      correlation_pack: correlation_pack || pack?.correlation_pack || null,
      event_pack: event_pack || pack?.event_pack || null,
      pattern_pack: pattern_pack || pack?.pattern_pack || null,
      explanation_pack: explanation_pack || pack?.explanation_pack || null,
      priority_pack: priority_pack || pack?.priority_pack || null
    };
  } catch (e) {
    console.warn('[PLC_CHAT_GROUNDING][summary]', e?.message || e);
    return {
      equipment_count: 0,
      last_collection_at: null,
      active_equipment_ids: [],
      alarm_summary: [],
      plc_intelligence: null
    };
  }
}

function formatForUserTurn(summary = {}) {
  if (summary.plc_intelligence) {
    const intel = { ...summary.plc_intelligence };
    if (summary.trend_pack) intel.trend_pack = summary.trend_pack;
    if (summary.anomaly_pack) intel.anomaly_pack = summary.anomaly_pack;
    if (summary.correlation_pack) intel.correlation_pack = summary.correlation_pack;
    if (summary.event_pack) intel.event_pack = summary.event_pack;
    if (summary.pattern_pack) intel.pattern_pack = summary.pattern_pack;
    if (summary.explanation_pack) intel.explanation_pack = summary.explanation_pack;
    if (summary.priority_pack) intel.priority_pack = summary.priority_pack;
    const block = plcOperationalIntelligence.formatIntelligenceForChat(intel);
    if (block) return block;
  }
  if (!summary.equipment_count) return '';
  const ids = (summary.active_equipment_ids || [])
    .map((e) => `${e.name || e.id} (${e.id})${e.is_active_recent === false ? ' [sem coleta recente]' : ''}`)
    .join(', ');
  const alarms = (summary.alarm_summary || [])
    .map((a) => `${a.state}: ${a.count} leitura(s)`)
    .join('; ');
  const health = summary.telemetry_health
    ? `; saúde telemetria=${summary.telemetry_health.score} (${summary.telemetry_health.label})`
    : '';
  return [
    'Telemetria PLC autorizada (snapshot — não inventar KPIs/OEE/percentagens de produção):',
    `- Equipamentos com leitura (${PLC_WINDOW_HOURS}h): ${summary.equipment_count}`,
    `- Activos recentemente: ${summary.active_equipment_count ?? '—'}`,
    `- IDs: ${ids || '—'}`,
    `- Última coleta: ${summary.last_collection_at || '—'}`,
    `- Runtime estimado (h): ${summary.runtime_hours ?? '—'}`,
    `- Resumo alarm_state: ${alarms || 'sem leituras com alarm_state na janela'}`,
    `- Alarmes não-ok (contagem): ${summary.alarm_count ?? 0}${health}`
  ].join('\n');
}

module.exports = {
  countDistinctPlcEquipment,
  fetchMinimalPlcGroundingSummary,
  fetchPlcOperationalIntelligencePack,
  formatForUserTurn,
  PLC_WINDOW_HOURS
};
