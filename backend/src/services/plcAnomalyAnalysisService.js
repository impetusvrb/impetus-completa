'use strict';

/**
 * FASE 42 — Anomalias operacionais observáveis (PLC, determinístico, sem ML/LLM).
 */
const db = require('../db');
const anomalyConfig = require('../config/anomalyBaselineConfig');

const SIGNAL_VARIABLES = [
  { key: 'temperature', expr: 'temperature' },
  { key: 'vibration', expr: 'COALESCE(vibration_level, vibration)' },
  { key: 'electrical_current', expr: 'electrical_current' },
  { key: 'pressure', expr: 'pressure' },
  { key: 'hydraulic_pressure', expr: 'hydraulic_pressure' },
  { key: 'water_flow', expr: 'water_flow' },
  { key: 'rpm', expr: 'rpm' }
];

const MAX_EQUIPMENT = 50;
let _columnCache = null;

function median(values) {
  const arr = (values || []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function mad(values, med) {
  if (med == null || !values.length) return 0;
  const devs = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  return median(devs) || 0;
}

function deviationPercent(observed, baseline) {
  if (baseline == null || !Number.isFinite(baseline) || baseline === 0) {
    if (observed == null || !Number.isFinite(observed)) return null;
    return observed !== 0 ? 100 : 0;
  }
  return ((observed - baseline) / Math.abs(baseline)) * 100;
}

/**
 * Classifica: normal | attention | anomaly | critical_anomaly
 */
function classifyAnomalyDeviation(devPct, opts = {}) {
  const v = Number(devPct);
  if (!Number.isFinite(v)) return 'normal';
  const abs = Math.abs(v);
  const { attention_min_percent, anomaly_min_percent, critical_min_percent } =
    anomalyConfig.deviation;

  let level = 'normal';
  if (abs >= critical_min_percent) level = 'critical_anomaly';
  else if (abs >= anomaly_min_percent) level = 'anomaly';
  else if (abs >= attention_min_percent) level = 'attention';

  if (opts.madExceeded === 'critical') {
    if (level === 'normal') level = 'anomaly';
    else if (level === 'attention') level = 'anomaly';
    else if (level === 'anomaly') level = 'critical_anomaly';
  } else if (opts.madExceeded === 'attention' && level === 'normal') {
    level = 'attention';
  }

  if (opts.trendRupture && level !== 'critical_anomaly' && abs >= attention_min_percent) {
    const order = ['normal', 'attention', 'anomaly', 'critical_anomaly'];
    const idx = order.indexOf(level);
    if (idx >= 0 && idx < order.length - 1) level = order[idx + 1];
  }

  if (v <= -anomalyConfig.deviation.abrupt_drop_percent) {
    if (level === 'normal') level = 'attention';
    else if (level === 'attention') level = 'anomaly';
  }

  return level;
}

function buildAnomalyEvidence({
  equipment_id,
  signal,
  baseline,
  observed,
  deviation_percent,
  classification,
  mad_value = null,
  percentile_p95 = null,
  detail = null
}) {
  return {
    equipment_id: String(equipment_id),
    signal: String(signal),
    baseline: baseline != null ? Math.round(Number(baseline) * 1000) / 1000 : null,
    observed: observed != null ? Math.round(Number(observed) * 1000) / 1000 : null,
    deviation_percent:
      deviation_percent != null ? Math.round(Number(deviation_percent) * 10) / 10 : null,
    classification,
    mad: mad_value != null ? Math.round(Number(mad_value) * 1000) / 1000 : null,
    percentile_p95: percentile_p95 != null ? Math.round(Number(percentile_p95) * 1000) / 1000 : null,
    detail,
    observational_only: true,
    generated_at: new Date().toISOString()
  };
}

async function getAvailableSignals() {
  if (_columnCache) return _columnCache;
  try {
    const r = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plc_collected_data'`
    );
    const cols = new Set((r.rows || []).map((row) => row.column_name));
    const available = [];
    for (const v of SIGNAL_VARIABLES) {
      if (v.key === 'vibration') {
        if (cols.has('vibration') || cols.has('vibration_level')) available.push(v);
      } else if (cols.has(v.key)) available.push(v);
    }
    if (cols.has('alarm_state')) {
      available.push({ key: 'alarm_state', expr: 'alarm_state', is_alarm: true });
    }
    _columnCache = available;
    return available;
  } catch (e) {
    console.warn('[PLC_ANOMALY][columns]', e?.message || e);
    return SIGNAL_VARIABLES;
  }
}

async function fetchSignalStats(companyId, equipmentId, varExpr, isAlarm = false) {
  if (isAlarm) {
    const r = await db.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE collected_at > NOW() - INTERVAL '24 hours'
             AND alarm_state IS NOT NULL
             AND TRIM(alarm_state) <> ''
             AND LOWER(TRIM(alarm_state)) NOT IN ('ok', 'none', 'normal', '0')
         )::int AS recent_non_ok,
         COUNT(*) FILTER (WHERE collected_at > NOW() - INTERVAL '24 hours')::int AS recent_total,
         COUNT(*) FILTER (
           WHERE collected_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
             AND alarm_state IS NOT NULL
             AND TRIM(alarm_state) <> ''
             AND LOWER(TRIM(alarm_state)) NOT IN ('ok', 'none', 'normal', '0')
         )::int AS hist_non_ok,
         COUNT(*) FILTER (
           WHERE collected_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
         )::int AS hist_total
       FROM plc_collected_data
       WHERE company_id = $1 AND equipment_id = $2`,
      [companyId, equipmentId]
    );
    const row = r.rows[0] || {};
    const recentRate =
      row.recent_total > 0 ? (row.recent_non_ok / row.recent_total) * 100 : 0;
    const histRate = row.hist_total > 0 ? (row.hist_non_ok / row.hist_total) * 100 : 0;
    return {
      baseline: histRate,
      observed: recentRate,
      deviation_percent: deviationPercent(recentRate, histRate || 0.01),
      hist_p95: null,
      mad_value: null,
      abrupt_observed: null,
      abrupt_baseline: null
    };
  }

  const r = await db.query(
    `SELECT
       percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
         WHERE collected_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
       ) AS baseline_median,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
         WHERE collected_at > NOW() - INTERVAL '24 hours'
       ) AS observed_median,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY val) FILTER (
         WHERE collected_at BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '24 hours'
       ) AS hist_p95,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
         WHERE collected_at > NOW() - INTERVAL '2 hours'
       ) AS abrupt_observed,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
         WHERE collected_at > NOW() - INTERVAL '24 hours'
           AND collected_at <= NOW() - INTERVAL '2 hours'
       ) AS abrupt_baseline
     FROM (
       SELECT collected_at, (${varExpr})::numeric AS val
       FROM plc_collected_data
       WHERE company_id = $1
         AND equipment_id = $2
         AND collected_at > NOW() - INTERVAL '30 days'
         AND (${varExpr}) IS NOT NULL
     ) sub
     WHERE val IS NOT NULL`,
    [companyId, equipmentId]
  );
  const row = r.rows[0] || {};
  return {
    baseline: row.baseline_median != null ? Number(row.baseline_median) : null,
    observed: row.observed_median != null ? Number(row.observed_median) : null,
    hist_p95: row.hist_p95 != null ? Number(row.hist_p95) : null,
    abrupt_observed: row.abrupt_observed != null ? Number(row.abrupt_observed) : null,
    abrupt_baseline: row.abrupt_baseline != null ? Number(row.abrupt_baseline) : null,
    mad_value: null
  };
}

async function fetchHistValuesForMad(companyId, equipmentId, varExpr) {
  const r = await db.query(
    `SELECT (${varExpr})::numeric AS val
     FROM plc_collected_data
     WHERE company_id = $1
       AND equipment_id = $2
       AND collected_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
       AND (${varExpr}) IS NOT NULL
     ORDER BY collected_at DESC
     LIMIT 500`,
    [companyId, equipmentId]
  );
  return (r.rows || []).map((row) => Number(row.val)).filter((n) => Number.isFinite(n));
}

async function listEquipmentIds(companyId) {
  const r = await db.query(
    `SELECT DISTINCT equipment_id
     FROM plc_collected_data
     WHERE company_id = $1
       AND equipment_id IS NOT NULL
       AND TRIM(equipment_id::text) <> ''
       AND collected_at > NOW() - INTERVAL '30 days'
     ORDER BY equipment_id
     LIMIT $2`,
    [companyId, MAX_EQUIPMENT]
  );
  return (r.rows || []).map((row) => String(row.equipment_id));
}

/**
 * 42-B — Motor de detecção por equipamento.
 */
async function detectOperationalAnomalies(companyId, opts = {}) {
  if (!companyId) return [];

  const signals = await getAvailableSignals();
  const equipmentIds = opts.equipment_id ? [opts.equipment_id] : await listEquipmentIds(companyId);
  const trendByEq = opts.trendByEquipment || new Map();
  const anomalies = [];

  for (const eqId of equipmentIds) {
    const trendRow = trendByEq.get(eqId) || null;

    for (const sig of signals) {
      try {
        const stats = await fetchSignalStats(companyId, eqId, sig.expr, sig.is_alarm === true);
        if (stats.observed == null && !sig.is_alarm) continue;

        const devPct =
          stats.deviation_percent != null
            ? stats.deviation_percent
            : deviationPercent(stats.observed, stats.baseline);

        if (devPct == null && !sig.is_alarm) continue;

        let madVal = stats.mad_value;
        let madExceeded = null;
        if (!sig.is_alarm && stats.baseline != null && stats.observed != null) {
          const histVals = await fetchHistValuesForMad(companyId, eqId, sig.expr);
          const med = median(histVals) ?? stats.baseline;
          madVal = mad(histVals, med);
          if (madVal > 0) {
            const z = Math.abs(stats.observed - med) / madVal;
            if (z >= anomalyConfig.mad.critical_multiplier) madExceeded = 'critical';
            else if (z >= anomalyConfig.mad.anomaly_multiplier) madExceeded = 'critical';
            else if (z >= anomalyConfig.mad.attention_multiplier) madExceeded = 'attention';
          }
        }

        const trendSig = trendRow?.[sig.key];
        const trendRupture =
          trendSig &&
          trendSig.trend === 'increasing' &&
          Number(trendSig.variation_percent) >= anomalyConfig.deviation.attention_min_percent;

        let classification = classifyAnomalyDeviation(devPct, { madExceeded, trendRupture });

        if (
          !sig.is_alarm &&
          stats.hist_p95 != null &&
          stats.observed != null &&
          stats.observed > stats.hist_p95 &&
          classification === 'normal'
        ) {
          classification = 'attention';
        }

        const abruptDev = deviationPercent(stats.abrupt_observed, stats.abrupt_baseline);
        if (
          abruptDev != null &&
          Math.abs(abruptDev) >= anomalyConfig.deviation.abrupt_drop_percent
        ) {
          const abruptClass = classifyAnomalyDeviation(abruptDev, {});
          if (
            ['attention', 'anomaly', 'critical_anomaly'].indexOf(abruptClass) >
            ['normal', 'attention', 'anomaly', 'critical_anomaly'].indexOf(classification)
          ) {
            classification = abruptClass;
          }
        }

        if (classification === 'normal') continue;

        anomalies.push(
          buildAnomalyEvidence({
            equipment_id: eqId,
            signal: sig.key,
            baseline: stats.baseline,
            observed: stats.observed,
            deviation_percent: devPct,
            classification,
            mad_value: madVal,
            percentile_p95: stats.hist_p95,
            detail: trendRupture ? 'trend_rupture_observed' : null
          })
        );
      } catch (e) {
        console.warn('[PLC_ANOMALY][detect]', eqId, sig.key, e?.message);
      }
    }
  }

  return anomalies;
}

/**
 * 42-D — Attention score (situação actual, independente do risk_score).
 */
function computeEquipmentAttentionScore(anomalies = [], context = {}) {
  const { attention_score: cfg } = anomalyConfig;
  let score = 0;
  const factors = [];

  for (const a of anomalies) {
    if (a.classification === 'critical_anomaly') {
      score += cfg.critical_anomaly_points;
      factors.push(`critical_${a.signal}`);
    } else if (a.classification === 'anomaly') {
      score += cfg.anomaly_points;
      factors.push(`anomaly_${a.signal}`);
    } else if (a.classification === 'attention') {
      score += cfg.attention_points;
      factors.push(`attention_${a.signal}`);
    }
  }

  if (context.alarm_active) {
    score += cfg.alarm_signal_points;
    factors.push('alarms_observed');
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let attention_level = 'normal';
  if (score > cfg.levels.elevated_max) attention_level = 'critical';
  else if (score > cfg.levels.normal_max) attention_level = 'elevated';

  return {
    equipment_id: context.equipment_id || anomalies[0]?.equipment_id || null,
    attention_score: score,
    attention_level,
    factors,
    observational_only: true
  };
}

async function buildOperationalAnomalyPack(companyId) {
  if (!companyId) {
    return {
      anomalies: [],
      equipment_attention: [],
      source_table: 'plc_collected_data',
      generated_at: new Date().toISOString()
    };
  }

  let trendByEquipment = new Map();
  try {
    const trend = require('./plcTrendAnalysisService');
    const trendPack = await trend.buildOperationalTrendPack(companyId);
    for (const row of trendPack.trend_snapshot?.equipment || []) {
      trendByEquipment.set(row.equipment_id, row);
    }
  } catch {
    /* noop */
  }

  const anomalies = await detectOperationalAnomalies(companyId, { trendByEquipment });

  const plcIntel = require('./plcOperationalIntelligenceService');
  const snap = await plcIntel.buildPlcIntelligenceSnapshot(companyId).catch(() => null);

  const byEq = new Map();
  for (const a of anomalies) {
    if (!byEq.has(a.equipment_id)) byEq.set(a.equipment_id, []);
    byEq.get(a.equipment_id).push(a);
  }

  const equipment_attention = [];
  for (const [eqId, eqAnomalies] of byEq) {
    equipment_attention.push(
      computeEquipmentAttentionScore(eqAnomalies, {
        equipment_id: eqId,
        alarm_active: snap?.alarm_active
      })
    );
  }

  for (const eqId of await listEquipmentIds(companyId)) {
    if (!byEq.has(eqId)) {
      equipment_attention.push(
        computeEquipmentAttentionScore([], {
          equipment_id: eqId,
          alarm_active: snap?.alarm_active
        })
      );
    }
  }

  equipment_attention.sort((a, b) => b.attention_score - a.attention_score);

  return {
    anomalies,
    equipment_attention,
    anomaly_count: anomalies.length,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function collectAnomalyEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    const v = Number(n);
    evidence.add(String(v));
    evidence.add(String(Math.round(v)));
    evidence.add(String(Math.round(v * 10) / 10));
  };
  for (const a of pack.anomalies || []) {
    add(a.baseline);
    add(a.observed);
    add(a.deviation_percent);
  }
  for (const e of pack.equipment_attention || []) {
    add(e.attention_score);
  }
  return evidence;
}

function formatAnomalyForChat(pack = {}) {
  const anomalies = pack.anomalies || [];
  const attention = pack.equipment_attention || [];
  if (!anomalies.length && !attention.some((a) => a.attention_score > 0)) {
    return '';
  }

  const lines = [
    'Anomalias operacionais observáveis (NÃO prever falha/manutenção/OEE):',
    `- Total anomalias detectadas: ${anomalies.length}`
  ];

  for (const a of anomalies.slice(0, 10)) {
    lines.push(
      `  • ${a.equipment_id} / ${a.signal}: ${a.classification}; ` +
        `baseline=${a.baseline}; observado=${a.observed}; desvio=${a.deviation_percent}%`
    );
  }

  const top = attention.find((x) => x.attention_score > anomalyConfig.attention_score.levels.normal_max);
  if (top) {
    lines.push(
      `- Maior attention_score observacional: ${top.equipment_id} = ${top.attention_score} (${top.attention_level})`
    );
  }

  return lines.join('\n');
}

/**
 * 42-G — Eventos para LiveOperationalFeed (somente com evidência).
 */
function buildLiveFeedEvents(anomalyPack = {}) {
  const events = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  for (const a of (anomalyPack.anomalies || []).slice(0, anomalyConfig.feed.max_events)) {
    const sev =
      a.classification === 'critical_anomaly'
        ? 'high'
        : a.classification === 'anomaly'
          ? 'medium'
          : 'low';
    const feedType =
      a.classification === 'critical_anomaly'
        ? 'TELEMETRY_CRITICAL_CHANGE'
        : Math.abs(Number(a.deviation_percent) || 0) >= anomalyConfig.deviation.abrupt_drop_percent
          ? 'SIGNAL_DEVIATION'
          : 'ANOMALY_OBSERVED';

    events.push({
      id: `plc-${feedType}-${a.equipment_id}-${a.signal}-${now.getTime()}`,
      time: timeStr,
      severity: sev,
      type: feedType,
      message:
        `[PLC] ${a.equipment_id}: ${a.signal} ${a.classification} — ` +
        `observado ${a.observed} vs baseline ${a.baseline} (${a.deviation_percent}%)`,
      source_table: 'plc_collected_data',
      audit_evidence: a,
      verification_state: 'plc_observed'
    });
  }

  return events;
}

module.exports = {
  classifyAnomalyDeviation,
  buildAnomalyEvidence,
  detectOperationalAnomalies,
  computeEquipmentAttentionScore,
  buildOperationalAnomalyPack,
  collectAnomalyEvidenceNumbers,
  formatAnomalyForChat,
  buildLiveFeedEvents,
  getAvailableSignals
};
