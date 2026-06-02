'use strict';

/**
 * FASE 41 — Análise temporal PLC (SQL + estatística determinística, sem ML/LLM).
 */
const db = require('../db');
const baselineConfig = require('../config/trendBaselineConfig');

const ELIGIBLE_VARIABLES = [
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

async function getAvailableVariableExprs() {
  if (_columnCache) return _columnCache;
  try {
    const r = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plc_collected_data'`
    );
    const cols = new Set((r.rows || []).map((row) => row.column_name));
    const available = [];
    for (const v of ELIGIBLE_VARIABLES) {
      if (v.key === 'vibration') {
        if (cols.has('vibration') || cols.has('vibration_level')) {
          available.push(v);
        }
      } else if (cols.has(v.key)) {
        available.push(v);
      }
    }
    _columnCache = available;
    return available;
  } catch (e) {
    console.warn('[PLC_TREND][columns]', e?.message || e);
    _columnCache = ELIGIBLE_VARIABLES.filter((v) => v.key !== 'vibration_level');
    return _columnCache;
  }
}

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

function classifyTrend(variationPercent) {
  const v = Number(variationPercent);
  if (!Number.isFinite(v)) return { trend: 'unknown', variation_percent: null };
  const abs = Math.abs(v);
  const { stable_max_percent, increasing_min_percent, decreasing_min_percent } =
    baselineConfig.trend;
  if (abs < stable_max_percent) {
    return { trend: 'stable', variation_percent: Math.round(v * 10) / 10 };
  }
  if (v >= increasing_min_percent) {
    return { trend: 'increasing', variation_percent: Math.round(v * 10) / 10 };
  }
  if (v <= -decreasing_min_percent) {
    return { trend: 'decreasing', variation_percent: Math.round(v * 10) / 10 };
  }
  return { trend: 'stable', variation_percent: Math.round(v * 10) / 10 };
}

/**
 * Baseline: normal | warning | critical
 */
function computeOperationalBaseline({ median: med, mad: madVal, variation_percent: varPct }) {
  const { normal_max_percent, warning_max_percent, critical_above_percent } =
    baselineConfig.baseline;
  const absVar = Math.abs(Number(varPct) || 0);
  let state = 'normal';
  if (absVar > critical_above_percent) state = 'critical';
  else if (absVar > normal_max_percent && absVar <= warning_max_percent) state = 'warning';
  else if (absVar > warning_max_percent) state = 'critical';

  const madRatio = med && med !== 0 ? (madVal / Math.abs(med)) * 100 : 0;
  if (madRatio > critical_above_percent && state === 'normal') state = 'warning';
  if (madRatio > warning_max_percent * 2 && state !== 'critical') state = 'critical';

  return {
    baseline_state: state,
    median: med != null ? Math.round(med * 1000) / 1000 : null,
    mad: madVal != null ? Math.round(madVal * 1000) / 1000 : null,
    variation_percent: varPct != null ? Math.round(Number(varPct) * 10) / 10 : null
  };
}

function variationPercent(recent, prior) {
  if (prior == null || !Number.isFinite(prior) || prior === 0) {
    if (recent == null || !Number.isFinite(recent)) return null;
    return recent !== 0 ? 100 : 0;
  }
  return ((recent - prior) / Math.abs(prior)) * 100;
}

/**
 * Agrega medianas por janela para um equipamento e variável.
 */
async function fetchWindowMedians(companyId, equipmentId, varExpr, varKey) {
  const q = `
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
        WHERE collected_at > NOW() - INTERVAL '24 hours'
      ) AS med_24h,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
        WHERE collected_at > NOW() - INTERVAL '7 days'
          AND collected_at <= NOW() - INTERVAL '24 hours'
      ) AS med_7d_prior,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
        WHERE collected_at > NOW() - INTERVAL '7 days'
      ) AS med_7d,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY val) FILTER (
        WHERE collected_at > NOW() - INTERVAL '30 days'
          AND collected_at <= NOW() - INTERVAL '7 days'
      ) AS med_30d_prior,
      COUNT(*) FILTER (WHERE collected_at > NOW() - INTERVAL '24 hours')::int AS n_24h,
      COUNT(*) FILTER (WHERE collected_at > NOW() - INTERVAL '7 days')::int AS n_7d
    FROM (
      SELECT collected_at, (${varExpr})::numeric AS val
      FROM plc_collected_data
      WHERE company_id = $1
        AND equipment_id = $2
        AND collected_at > NOW() - INTERVAL '30 days'
        AND (${varExpr}) IS NOT NULL
    ) sub
    WHERE val IS NOT NULL
  `;
  const r = await db.query(q, [companyId, equipmentId]);
  const row = r.rows[0] || {};
  const med24 = row.med_24h != null ? Number(row.med_24h) : null;
  const med7prior = row.med_7d_prior != null ? Number(row.med_7d_prior) : null;
  const med7 = row.med_7d != null ? Number(row.med_7d) : null;
  const med30prior = row.med_30d_prior != null ? Number(row.med_30d_prior) : null;

  const var7d = variationPercent(med24 ?? med7, med7prior ?? med30prior);
  const var30d = variationPercent(med7, med30prior);

  const trendPrimary = classifyTrend(var7d ?? var30d);
  const baseline = computeOperationalBaseline({
    median: med24 ?? med7,
    mad: 0,
    variation_percent: trendPrimary.variation_percent
  });

  return {
    variable: varKey,
    windows: {
      hours_24: { median: med24, sample_count: row.n_24h ?? 0 },
      days_7: { median: med7, sample_count: row.n_7d ?? 0 },
      days_30: { median_prior_period: med30prior }
    },
    trend: trendPrimary.trend,
    variation_percent: trendPrimary.variation_percent,
    variation_7d_percent: var7d != null ? Math.round(var7d * 10) / 10 : null,
    variation_30d_percent: var30d != null ? Math.round(var30d * 10) / 10 : null,
    baseline_state: baseline.baseline_state,
    median: baseline.median,
    mad: baseline.mad
  };
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
 * Trend snapshot por equipamento (41-A).
 */
async function buildTrendSnapshot(companyId, equipmentId = null) {
  if (!companyId) return { equipment: [], generated_at: new Date().toISOString() };

  const variables = await getAvailableVariableExprs();
  const equipmentIds = equipmentId ? [equipmentId] : await listEquipmentIds(companyId);
  const equipment = [];

  for (const eqId of equipmentIds) {
    const signals = {};
    for (const v of variables) {
      try {
        const stats = await fetchWindowMedians(companyId, eqId, v.expr, v.key);
        if (stats.windows?.hours_24?.sample_count > 0 || stats.windows?.days_7?.sample_count > 0) {
          signals[v.key] = {
            trend: stats.trend,
            variation_percent: stats.variation_percent,
            variation_7d_percent: stats.variation_7d_percent,
            baseline_state: stats.baseline_state,
            median_24h: stats.windows.hours_24.median
          };
        }
      } catch (e) {
        console.warn('[PLC_TREND][var]', eqId, v.key, e?.message);
      }
    }
    if (Object.keys(signals).length) {
      equipment.push({
        equipment_id: eqId,
        ...signals
      });
    }
  }

  return {
    company_id: companyId,
    comparison_windows: ['24h', '7d', '30d'],
    equipment,
    generated_at: new Date().toISOString(),
    source_table: 'plc_collected_data'
  };
}

/**
 * Risk score observacional 0–100 (41-C) — não preditivo.
 */
function computeEquipmentRiskScore(equipmentTrendRow, context = {}) {
  const { risk } = baselineConfig;
  let score = 0;
  const factors = [];

  const bump = (points, reason) => {
    score += points;
    factors.push(reason);
  };

  for (const [key, sig] of Object.entries(equipmentTrendRow)) {
    if (key === 'equipment_id' || key === 'risk_score' || key === 'risk_level') continue;
    if (!sig || typeof sig !== 'object') continue;
    const vp = Number(sig.variation_percent);
    if (sig.trend === 'increasing' && Number.isFinite(vp)) {
      if (key === 'vibration' && vp >= baselineConfig.trend.increasing_min_percent) {
        bump(Math.min(risk.vibration_increase_weight, vp), `vibration_increase_${vp}%`);
      }
      if (key === 'temperature' && vp >= baselineConfig.trend.increasing_min_percent) {
        bump(Math.min(risk.temperature_increase_weight, vp * 0.8), `temperature_increase_${vp}%`);
      }
    }
    if (sig.baseline_state === 'warning') bump(8, `${key}_baseline_warning`);
    if (sig.baseline_state === 'critical') bump(15, `${key}_baseline_critical`);
  }

  const alarmFreq = Number(context.alarm_frequency) || 0;
  if (alarmFreq > 0) {
    bump(Math.min(risk.alarm_readings_weight, alarmFreq * 100), 'alarms_observed');
  }

  const health = Number(context.telemetry_health_score);
  if (Number.isFinite(health) && health < 75) {
    bump(risk.telemetry_health_drop_weight * ((75 - health) / 75), 'telemetry_health_degraded');
  }

  const coverage = Number(context.telemetry_coverage);
  if (Number.isFinite(coverage) && coverage < 0.85) {
    bump(risk.coverage_drop_weight * (1 - coverage), 'coverage_drop');
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let risk_level = 'normal';
  if (score > risk.levels.warning_max) risk_level = 'critical';
  else if (score > risk.levels.normal_max) risk_level = 'warning';

  return {
    equipment_id: equipmentTrendRow.equipment_id,
    risk_score: score,
    risk_level,
    factors,
    observational_only: true
  };
}

/**
 * Pacote completo tendências + risk + baseline.
 */
async function buildOperationalTrendPack(companyId) {
  if (!companyId) {
    return {
      trend_snapshot: { equipment: [] },
      equipment_risk: [],
      source_table: 'plc_collected_data'
    };
  }

  const plcIntel = require('./plcOperationalIntelligenceService');
  const [trend_snapshot, summaries, snap] = await Promise.all([
    buildTrendSnapshot(companyId),
    plcIntel.buildEquipmentOperationalSummaries(companyId).catch(() => []),
    plcIntel.buildPlcIntelligenceSnapshot(companyId).catch(() => null)
  ]);

  const summaryByEq = new Map((summaries || []).map((s) => [s.equipment_id, s]));
  const healthScore = snap?.telemetry_health?.score;
  const coverage = snap?.telemetry_coverage;

  const equipment_risk = [];
  for (const row of trend_snapshot.equipment || []) {
    const ctx = summaryByEq.get(row.equipment_id) || {};
    const risk = computeEquipmentRiskScore(row, {
      alarm_frequency: ctx.alarm_frequency,
      telemetry_health_score: healthScore,
      telemetry_coverage: ctx.telemetry_coverage ?? coverage
    });
    equipment_risk.push(risk);
  }

  equipment_risk.sort((a, b) => b.risk_score - a.risk_score);

  return {
    trend_snapshot,
    equipment_risk,
    baseline_summary: summarizeBaselines(trend_snapshot),
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function summarizeBaselines(trend_snapshot) {
  const states = { normal: 0, warning: 0, critical: 0 };
  for (const eq of trend_snapshot.equipment || []) {
    for (const key of Object.keys(eq)) {
      if (key === 'equipment_id') continue;
      const st = eq[key]?.baseline_state;
      if (st && states[st] != null) states[st] += 1;
    }
  }
  return states;
}

function collectTrendEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    const v = Number(n);
    evidence.add(String(v));
    evidence.add(String(Math.round(v)));
    evidence.add(String(Math.round(v * 10) / 10));
  };

  for (const eq of pack.trend_snapshot?.equipment || []) {
    for (const key of Object.keys(eq)) {
      if (key === 'equipment_id') continue;
      const sig = eq[key];
      if (!sig) continue;
      add(sig.variation_percent);
      add(sig.variation_7d_percent);
      add(sig.median_24h);
    }
  }
  for (const r of pack.equipment_risk || []) {
    add(r.risk_score);
  }
  return evidence;
}

function formatTrendForChat(pack = {}) {
  const snap = pack.trend_snapshot;
  const risks = pack.equipment_risk || [];
  if (!snap?.equipment?.length) return '';

  const lines = [
    'Análise temporal PLC (tendências observáveis — NÃO prever falha/manutenção/OEE):',
    `- Janelas comparadas: ${(snap.comparison_windows || []).join(', ')}`,
    `- Baseline agregado: normal=${pack.baseline_summary?.normal ?? 0}, warning=${pack.baseline_summary?.warning ?? 0}, critical=${pack.baseline_summary?.critical ?? 0}`
  ];

  for (const eq of snap.equipment.slice(0, 8)) {
    const parts = [];
    for (const [k, sig] of Object.entries(eq)) {
      if (k === 'equipment_id' || !sig?.trend) continue;
      parts.push(
        `${k}: ${sig.trend} (${sig.variation_percent != null ? `${sig.variation_percent}%` : '—'}, baseline ${sig.baseline_state || '—'})`
      );
    }
    const risk = risks.find((r) => r.equipment_id === eq.equipment_id);
    lines.push(
      `  • ${eq.equipment_id}: ${parts.join('; ')}` +
        (risk ? ` | risk_score observacional=${risk.risk_score} (${risk.risk_level})` : '')
    );
  }

  const top = risks[0];
  if (top && top.risk_score > baselineConfig.risk.levels.normal_max) {
    lines.push(
      `- Equipamento com maior atenção observável: ${top.equipment_id} (score ${top.risk_score})`
    );
  }

  return lines.join('\n');
}

module.exports = {
  getAvailableVariableExprs,
  classifyTrend,
  computeOperationalBaseline,
  buildTrendSnapshot,
  computeEquipmentRiskScore,
  buildOperationalTrendPack,
  collectTrendEvidenceNumbers,
  formatTrendForChat,
  ELIGIBLE_VARIABLES
};
