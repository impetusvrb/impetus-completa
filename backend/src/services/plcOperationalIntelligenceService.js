'use strict';

/**
 * FASE 40 — PLC Operational Intelligence (read-only, auditável).
 * Métricas calculáveis a partir de plc_collected_data — sem OEE/MTBF/produção inventados.
 */
const db = require('../db');

const DEFAULT_WINDOW_HOURS = 24;
const ACTIVE_RECENCY_MINUTES = 15;
const EXPECTED_INTERVAL_SEC = 10;
const GAP_MODERATE_SEC = 60;
const GAP_FREQUENT_SEC = 300;
const MAX_EQUIPMENT_SUMMARIES = 50;

function hoursBetween(a, b) {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms > 0 ? ms / 3600000 : 0;
}

function scoreFromMedianGap(medianGapSec) {
  if (medianGapSec == null || !Number.isFinite(medianGapSec)) return 0;
  if (medianGapSec <= EXPECTED_INTERVAL_SEC * 2) return 100;
  if (medianGapSec <= GAP_MODERATE_SEC) return 75;
  if (medianGapSec <= GAP_FREQUENT_SEC) return 50;
  return 25;
}

/**
 * Score 0–100 da saúde da telemetria (apenas qualidade de coleta).
 */
async function computeTelemetryHealthScore(companyId, windowHours = DEFAULT_WINDOW_HOURS) {
  if (!companyId) {
    return { score: 0, label: 'sem_telemetria', equipment_scores: [] };
  }
  const wh = Math.max(1, Number(windowHours) || DEFAULT_WINDOW_HOURS);
  try {
    const r = await db.query(
      `WITH ordered AS (
         SELECT equipment_id, collected_at,
                LAG(collected_at) OVER (PARTITION BY equipment_id ORDER BY collected_at) AS prev_at
         FROM plc_collected_data
         WHERE company_id = $1
           AND equipment_id IS NOT NULL
           AND TRIM(equipment_id::text) <> ''
           AND collected_at > NOW() - INTERVAL '1 hour' * $2
       ),
       gaps AS (
         SELECT equipment_id,
                percentile_cont(0.5) WITHIN GROUP (
                  ORDER BY EXTRACT(EPOCH FROM (collected_at - prev_at))
                ) AS median_gap_sec,
                COUNT(*)::int AS points
         FROM ordered
         WHERE prev_at IS NOT NULL
         GROUP BY equipment_id
       )
       SELECT equipment_id, median_gap_sec, points FROM gaps`,
      [companyId, wh]
    );
    if (!r.rows.length) {
      const hasAny = await db.query(
        `SELECT COUNT(*)::int AS c FROM plc_collected_data
         WHERE company_id = $1 AND collected_at > NOW() - INTERVAL '1 hour' * $2`,
        [companyId, wh]
      );
      const c = hasAny.rows[0]?.c ?? 0;
      if (c === 0) return { score: 0, label: 'sem_telemetria', equipment_scores: [] };
      return { score: 50, label: 'gaps_frequentes', equipment_scores: [], detail: 'pontos_sem_pares_para_gap' };
    }
    const equipment_scores = r.rows.map((row) => {
      const median = Number(row.median_gap_sec);
      const score = scoreFromMedianGap(median);
      return {
        equipment_id: String(row.equipment_id),
        median_gap_sec: median,
        telemetry_points: Number(row.points) || 0,
        score
      };
    });
    let totalWeight = 0;
    let weighted = 0;
    for (const e of equipment_scores) {
      const w = Math.max(1, e.telemetry_points);
      weighted += e.score * w;
      totalWeight += w;
    }
    const score = totalWeight ? Math.round(weighted / totalWeight) : 0;
    let label = 'sem_telemetria';
    if (score >= 90) label = 'coleta_continua';
    else if (score >= 70) label = 'gaps_moderados';
    else if (score >= 40) label = 'gaps_frequentes';
    else if (score > 0) label = 'coleta_degradada';
    return { score, label, equipment_scores, window_hours: wh };
  } catch (e) {
    console.warn('[PLC_OP_INTEL][health]', e?.message || e);
    return { score: 0, label: 'erro_calculo', error: e?.message };
  }
}

/**
 * Resumo por equipment_id (read-only).
 */
async function buildEquipmentOperationalSummaries(companyId, windowHours = DEFAULT_WINDOW_HOURS) {
  if (!companyId) return [];
  const wh = Math.max(1, Number(windowHours) || DEFAULT_WINDOW_HOURS);
  try {
    const r = await db.query(
      `SELECT equipment_id,
              COALESCE(NULLIF(TRIM(MAX(equipment_name)), ''), equipment_id::text) AS equipment_name,
              MIN(collected_at) AS first_seen,
              MAX(collected_at) AS last_seen,
              COUNT(*)::int AS telemetry_points,
              COUNT(*) FILTER (
                WHERE status IS NOT NULL AND LOWER(TRIM(status)) IN ('running', 'run', 'active', 'on')
              )::int AS running_points,
              COUNT(*) FILTER (
                WHERE alarm_state IS NOT NULL
                  AND TRIM(alarm_state) <> ''
                  AND LOWER(TRIM(alarm_state)) NOT IN ('ok', 'none', 'normal', '0')
              )::int AS alarm_readings
       FROM plc_collected_data
       WHERE company_id = $1
         AND equipment_id IS NOT NULL
         AND TRIM(equipment_id::text) <> ''
         AND collected_at > NOW() - INTERVAL '1 hour' * $2
       GROUP BY equipment_id
       ORDER BY MAX(collected_at) DESC
       LIMIT $3`,
      [companyId, wh, MAX_EQUIPMENT_SUMMARIES]
    );

    const activeCutoff = new Date(Date.now() - ACTIVE_RECENCY_MINUTES * 60 * 1000);

    return (r.rows || []).map((row) => {
      const first = row.first_seen ? new Date(row.first_seen) : null;
      const last = row.last_seen ? new Date(row.last_seen) : null;
      const points = Number(row.telemetry_points) || 0;
      const spanHours = hoursBetween(first, last);
      const expectedPoints = spanHours > 0 ? (spanHours * 3600) / EXPECTED_INTERVAL_SEC : points;
      const coverage =
        expectedPoints > 0 ? Math.min(1, Math.round((points / expectedPoints) * 1000) / 1000) : 0;

      let estimated_runtime_hours = 0;
      if (points > 0) {
        if (spanHours > 0 && points > 1) {
          estimated_runtime_hours = Math.min(wh, spanHours * Math.min(1, coverage));
        } else {
          estimated_runtime_hours = (points * EXPECTED_INTERVAL_SEC) / 3600;
        }
      }
      const runningPoints = Number(row.running_points) || 0;
      if (runningPoints > 0) {
        estimated_runtime_hours = Math.min(
          wh,
          (runningPoints * EXPECTED_INTERVAL_SEC) / 3600
        );
      }

      const alarmReadings = Number(row.alarm_readings) || 0;
      const alarm_frequency =
        points > 0 ? Math.round((alarmReadings / points) * 10000) / 10000 : 0;

      return {
        equipment_id: String(row.equipment_id),
        equipment_name: String(row.equipment_name || row.equipment_id),
        first_seen: first ? first.toISOString() : null,
        last_seen: last ? last.toISOString() : null,
        telemetry_points: points,
        estimated_runtime_hours: Math.round(estimated_runtime_hours * 100) / 100,
        alarm_frequency,
        alarm_readings: alarmReadings,
        telemetry_coverage: coverage,
        is_active_recent: last ? last >= activeCutoff : false
      };
    });
  } catch (e) {
    console.warn('[PLC_OP_INTEL][equipment_summary]', e?.message || e);
    return [];
  }
}

/**
 * Snapshot operacional PLC (40-A).
 */
async function buildPlcIntelligenceSnapshot(companyId, windowHours = DEFAULT_WINDOW_HOURS) {
  const empty = {
    equipment_count: 0,
    active_equipment_count: 0,
    last_collection_at: null,
    runtime_hours: 0,
    telemetry_coverage: 0,
    alarm_count: 0,
    alarm_active: false,
    telemetry_health: { score: 0, label: 'sem_telemetria' },
    window_hours: windowHours,
    generated_at: new Date().toISOString(),
    source_table: 'plc_collected_data'
  };
  if (!companyId) return empty;

  const wh = Math.max(1, Number(windowHours) || DEFAULT_WINDOW_HOURS);
  try {
    const [aggRes, lastRes, health] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT equipment_id)::int AS equipment_count,
                COUNT(DISTINCT equipment_id) FILTER (
                  WHERE collected_at > NOW() - INTERVAL '1 minute' * $3
                )::int AS active_equipment_count,
                COUNT(*)::int AS telemetry_points,
                COUNT(*) FILTER (
                  WHERE alarm_state IS NOT NULL
                    AND TRIM(alarm_state) <> ''
                    AND LOWER(TRIM(alarm_state)) NOT IN ('ok', 'none', 'normal', '0')
                )::int AS alarm_count,
                MIN(collected_at) AS window_first,
                MAX(collected_at) AS window_last
         FROM plc_collected_data
         WHERE company_id = $1
           AND equipment_id IS NOT NULL
           AND TRIM(equipment_id::text) <> ''
           AND collected_at > NOW() - INTERVAL '1 hour' * $2`,
        [companyId, wh, ACTIVE_RECENCY_MINUTES]
      ),
      db.query(
        `SELECT MAX(collected_at) AS last_at FROM plc_collected_data WHERE company_id = $1`,
        [companyId]
      ),
      computeTelemetryHealthScore(companyId, wh)
    ]);

    const agg = aggRes.rows[0] || {};
    const equipment_count = agg.equipment_count ?? 0;
    const telemetry_points = agg.telemetry_points ?? 0;
    const windowFirst = agg.window_first ? new Date(agg.window_first) : null;
    const windowLast = agg.window_last ? new Date(agg.window_last) : null;
    const spanHours = hoursBetween(windowFirst, windowLast) || wh;
    const expectedPoints = (wh * 3600) / EXPECTED_INTERVAL_SEC * Math.max(1, equipment_count);
    const telemetry_coverage =
      expectedPoints > 0
        ? Math.min(1, Math.round((telemetry_points / expectedPoints) * 1000) / 1000)
        : 0;

    const summaries = await buildEquipmentOperationalSummaries(companyId, wh);
    const runtime_hours = Math.round(
      summaries.reduce((s, e) => s + (e.estimated_runtime_hours || 0), 0) * 100
    ) / 100;

    const alarm_count = agg.alarm_count ?? 0;
    const alarm_active = alarm_count > 0;

    return {
      equipment_count,
      active_equipment_count: agg.active_equipment_count ?? 0,
      last_collection_at: lastRes.rows[0]?.last_at
        ? new Date(lastRes.rows[0].last_at).toISOString()
        : null,
      runtime_hours,
      telemetry_coverage,
      alarm_count,
      alarm_active,
      telemetry_health: {
        score: health.score ?? 0,
        label: health.label ?? 'sem_telemetria'
      },
      window_hours: wh,
      generated_at: new Date().toISOString(),
      source_table: 'plc_collected_data'
    };
  } catch (e) {
    console.warn('[PLC_OP_INTEL][snapshot]', e?.message || e);
    return { ...empty, error: e?.message };
  }
}

/**
 * Pacote completo para chat / truth / métricas.
 */
async function buildPlcOperationalPack(companyId, windowHours = DEFAULT_WINDOW_HOURS) {
  const [snapshot, equipment_operational_summary, telemetry_health_detail] = await Promise.all([
    buildPlcIntelligenceSnapshot(companyId, windowHours),
    buildEquipmentOperationalSummaries(companyId, windowHours),
    computeTelemetryHealthScore(companyId, windowHours)
  ]);
  return {
    snapshot,
    equipment_operational_summary,
    telemetry_health_detail,
    window_hours: windowHours,
    source_table: 'plc_collected_data'
  };
}

/**
 * Números autorizados para Industrial Truth (evidence binding).
 */
function collectTelemetryEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const snap = pack.snapshot || pack;
  const summaries = pack.equipment_operational_summary || [];

  const addNum = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    const v = Number(n);
    evidence.add(String(v));
    if (Number.isInteger(v)) evidence.add(String(v));
    evidence.add(String(Math.round(v)));
    evidence.add(String(Math.round(v * 10) / 10));
    evidence.add(String(Math.round(v * 100) / 100));
  };

  addNum(snap.equipment_count);
  addNum(snap.active_equipment_count);
  addNum(snap.runtime_hours);
  addNum(snap.alarm_count);
  addNum(snap.telemetry_health?.score);
  addNum(Math.round((snap.telemetry_coverage || 0) * 100));

  for (const e of summaries) {
    addNum(e.telemetry_points);
    addNum(e.estimated_runtime_hours);
    addNum(e.alarm_readings);
    addNum(Math.round((e.telemetry_coverage || 0) * 100));
    addNum(Math.round((e.alarm_frequency || 0) * 100));
  }

  if (pack.trend_pack) {
    try {
      const trendEvidence = require('./plcTrendAnalysisService').collectTrendEvidenceNumbers(
        pack.trend_pack
      );
      for (const n of trendEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  if (pack.anomaly_pack) {
    try {
      const anomEvidence = require('./plcAnomalyAnalysisService').collectAnomalyEvidenceNumbers(
        pack.anomaly_pack
      );
      for (const n of anomEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  if (pack.correlation_pack) {
    try {
      const corrEvidence = require('./plcCorrelationAnalysisService').collectCorrelationEvidenceNumbers(
        pack.correlation_pack
      );
      for (const n of corrEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  if (pack.event_pack) {
    try {
      const evEvidence = require('./operationalEventIntelligenceService').collectEventEvidenceNumbers(
        pack.event_pack
      );
      for (const n of evEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  if (pack.pattern_pack) {
    try {
      const patEvidence = require('./operationalPatternIntelligenceService').collectPatternEvidenceNumbers(
        pack.pattern_pack
      );
      for (const n of patEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  if (pack.explanation_pack) {
    try {
      const explEvidence = require('./operationalExplanationService').collectExplanationEvidenceNumbers(
        pack.explanation_pack
      );
      for (const n of explEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  if (pack.priority_pack) {
    try {
      const priEvidence = require('./operationalPrioritizationService').collectPriorityEvidenceNumbers(
        pack.priority_pack
      );
      for (const n of priEvidence) evidence.add(n);
    } catch {
      /* noop */
    }
  }

  return evidence;
}

function formatIntelligenceForChat(pack = {}) {
  const snap = pack.snapshot || {};
  const summaries = pack.equipment_operational_summary || [];
  if (!snap.equipment_count && !summaries.length) return '';

  const lines = [
    'Inteligência operacional PLC (factos auditáveis — NÃO inventar OEE/produção/MTBF/qualidade %):',
    `- Equipamentos com telemetria (${snap.window_hours || DEFAULT_WINDOW_HOURS}h): ${snap.equipment_count}`,
    `- Equipamentos com coleta recente (≤${ACTIVE_RECENCY_MINUTES} min): ${snap.active_equipment_count}`,
    `- Última coleta global: ${snap.last_collection_at || '—'}`,
    `- Runtime estimado (soma equipamentos, h): ${snap.runtime_hours}`,
    `- Cobertura telemetria (0–1): ${snap.telemetry_coverage}`,
    `- Alarmes observados (leituras não-ok na janela): ${snap.alarm_count}`,
    `- Alarme activo observado: ${snap.alarm_active ? 'sim' : 'não'}`,
    `- Saúde telemetria (0–100): ${snap.telemetry_health?.score ?? 0} (${snap.telemetry_health?.label || '—'})`
  ];

  const eqLines = summaries.slice(0, 12).map((e) => {
    const active = e.is_active_recent ? 'activo' : 'sem coleta recente';
    return (
      `  • ${e.equipment_name} (${e.equipment_id}): ${active}; ` +
      `pontos=${e.telemetry_points}; runtime_est≈${e.estimated_runtime_hours}h; ` +
      `última=${e.last_seen || '—'}; alarm_freq=${e.alarm_frequency}`
    );
  });
  if (eqLines.length) {
    lines.push('- Resumo por equipamento:');
    lines.push(...eqLines);
  }

  if (pack.trend_pack?.trend_snapshot?.equipment?.length) {
    try {
      const trendBlock = require('./plcTrendAnalysisService').formatTrendForChat(pack.trend_pack);
      if (trendBlock) {
        lines.push('');
        lines.push(trendBlock);
      }
    } catch {
      /* noop */
    }
  }

  if (pack.anomaly_pack) {
    try {
      const anomBlock = require('./plcAnomalyAnalysisService').formatAnomalyForChat(pack.anomaly_pack);
      if (anomBlock) {
        lines.push('');
        lines.push(anomBlock);
      }
    } catch {
      /* noop */
    }
  }

  if (pack.correlation_pack) {
    try {
      const corrBlock = require('./plcCorrelationAnalysisService').formatCorrelationForChat(
        pack.correlation_pack
      );
      if (corrBlock) {
        lines.push('');
        lines.push(corrBlock);
      }
    } catch {
      /* noop */
    }
  }

  if (pack.event_pack) {
    try {
      const evBlock = require('./operationalEventIntelligenceService').formatEventsForChat(
        pack.event_pack
      );
      if (evBlock) {
        lines.push('');
        lines.push(evBlock);
      }
    } catch {
      /* noop */
    }
  }

  if (pack.pattern_pack) {
    try {
      const patBlock = require('./operationalPatternIntelligenceService').formatPatternsForChat(
        pack.pattern_pack
      );
      if (patBlock) {
        lines.push('');
        lines.push(patBlock);
      }
    } catch {
      /* noop */
    }
  }

  if (pack.explanation_pack) {
    try {
      const explBlock = require('./operationalExplanationService').formatExplanationsForChat(
        pack.explanation_pack
      );
      if (explBlock) {
        lines.push('');
        lines.push(explBlock);
      }
    } catch {
      /* noop */
    }
  }

  if (pack.priority_pack) {
    try {
      const priBlock = require('./operationalPrioritizationService').formatPrioritiesForChat(
        pack.priority_pack
      );
      if (priBlock) {
        lines.push('');
        lines.push(priBlock);
      }
    } catch {
      /* noop */
    }
  }

  return lines.join('\n');
}

module.exports = {
  buildPlcIntelligenceSnapshot,
  buildEquipmentOperationalSummaries,
  computeTelemetryHealthScore,
  buildPlcOperationalPack,
  collectTelemetryEvidenceNumbers,
  formatIntelligenceForChat,
  DEFAULT_WINDOW_HOURS,
  ACTIVE_RECENCY_MINUTES,
  EXPECTED_INTERVAL_SEC
};
