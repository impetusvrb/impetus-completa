'use strict';

/**
 * FASE 43 — Correlação observável entre sinais PLC (Pearson, Spearman, covariância; sem ML/causalidade).
 */
const db = require('../db');
const corrConfig = require('../config/correlationBaselineConfig');

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

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr, m = null) {
  if (arr.length < 2) return 0;
  const mu = m != null ? m : mean(arr);
  const v = arr.reduce((s, x) => s + (x - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return null;
  const mx = mean(x);
  const my = mean(y);
  const sx = stdDev(x, mx);
  const sy = stdDev(y, my);
  if (sx === 0 || sy === 0) return null;
  let cov = 0;
  for (let i = 0; i < n; i++) cov += (x[i] - mx) * (y[i] - my);
  return cov / ((n - 1) * sx * sy);
}

function rankArray(arr) {
  const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j += 1;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function spearman(x, y) {
  if (x.length < 2 || y.length < 2) return null;
  return pearson(rankArray(x), rankArray(y));
}

function covariance(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return null;
  const mx = mean(x);
  const my = mean(y);
  let cov = 0;
  for (let i = 0; i < n; i++) cov += (x[i] - mx) * (y[i] - my);
  return cov / (n - 1);
}

/** Correlação robusta: Spearman (resistente a outliers). */
function robustCorrelation(x, y) {
  return spearman(x, y);
}

function classifyCorrelation(absR) {
  const r = Math.abs(Number(absR));
  if (!Number.isFinite(r) || r < corrConfig.classification.none_max) return 'none';
  if (r < corrConfig.classification.weak_max) return 'weak';
  if (r < corrConfig.classification.moderate_max) return 'moderate';
  if (r < corrConfig.classification.strong_max) return 'strong';
  return 'very_strong';
}

function buildCorrelationEvidence({
  equipment_id,
  window,
  signal_a,
  signal_b,
  correlation,
  pearson_r,
  spearman_r,
  covariance_value,
  sample_size,
  classification
}) {
  const primary = Number(correlation);
  return {
    equipment_id: String(equipment_id),
    window: String(window),
    signal_a: String(signal_a),
    signal_b: String(signal_b),
    correlation: Math.round(primary * 1000) / 1000,
    pearson: pearson_r != null ? Math.round(pearson_r * 1000) / 1000 : null,
    spearman: spearman_r != null ? Math.round(spearman_r * 1000) / 1000 : null,
    covariance: covariance_value != null ? Math.round(covariance_value * 1000) / 1000 : null,
    sample_size: Number(sample_size) || 0,
    classification,
    observational_only: true,
    no_causality_inferred: true,
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
      available.push({
        key: 'alarm_state',
        expr: `CASE WHEN LOWER(TRIM(alarm_state)) IN ('ok','none','normal','0') OR alarm_state IS NULL OR TRIM(alarm_state)='' THEN 0 ELSE 1 END`,
        is_alarm: true
      });
    }
    _columnCache = available;
    return available;
  } catch (e) {
    console.warn('[PLC_CORR][columns]', e?.message || e);
    return SIGNAL_VARIABLES;
  }
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

async function fetchAlignedSeries(companyId, equipmentId, signals, windowHours) {
  const cols = signals.map((s) => `(${s.expr})::numeric AS ${s.key}`).join(', ');
  const r = await db.query(
    `SELECT collected_at, ${cols}
     FROM plc_collected_data
     WHERE company_id = $1
       AND equipment_id = $2
       AND collected_at > NOW() - INTERVAL '1 hour' * $3
     ORDER BY collected_at ASC
     LIMIT $4`,
    [companyId, equipmentId, windowHours, corrConfig.max_samples_per_window]
  );
  return { rows: r.rows || [], row_count: (r.rows || []).length };
}

function alignedPairs(rows, keyA, keyB) {
  const x = [];
  const y = [];
  for (const row of rows || []) {
    const a = row[keyA];
    const b = row[keyB];
    if (
      a != null &&
      b != null &&
      Number.isFinite(Number(a)) &&
      Number.isFinite(Number(b))
    ) {
      x.push(Number(a));
      y.push(Number(b));
    }
  }
  return { x, y };
}

function computePairCorrelation(x, y) {
  if (x.length < corrConfig.min_sample_size) return null;
  const p = pearson(x, y);
  const sp = spearman(x, y);
  const cov = covariance(x, y);
  const robust = robustCorrelation(x, y);
  const primary = sp != null ? sp : p;
  if (primary == null || !Number.isFinite(primary)) return null;
  if (Math.abs(primary) < corrConfig.min_report_abs) return null;
  return {
    pearson: p,
    spearman: sp,
    covariance: cov,
    robust,
    correlation: primary,
    sample_size: x.length,
    classification: classifyCorrelation(primary)
  };
}

/**
 * 43-B — Snapshot por equipamento e janela.
 */
async function buildCorrelationSnapshot(companyId, equipmentId = null) {
  if (!companyId) {
    return { equipment: [], generated_at: new Date().toISOString(), source_table: 'plc_collected_data' };
  }

  const signals = await getAvailableSignals();
  const keys = signals.map((s) => s.key);
  const equipmentIds = equipmentId ? [equipmentId] : await listEquipmentIds(companyId);
  const equipment = [];

  for (const eqId of equipmentIds) {
    const windows = {};
    for (const w of Object.values(corrConfig.windows)) {
      const { rows } = await fetchAlignedSeries(companyId, eqId, signals, w.hours);
      const pairs = [];
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const keyA = keys[i];
          const keyB = keys[j];
          const { x, y } = alignedPairs(rows, keyA, keyB);
          const stats = computePairCorrelation(x, y);
          if (!stats || stats.classification === 'none') continue;
          pairs.push(
            buildCorrelationEvidence({
              equipment_id: eqId,
              window: w.key,
              signal_a: keyA,
              signal_b: keyB,
              correlation: stats.correlation,
              pearson_r: stats.pearson,
              spearman_r: stats.spearman,
              covariance_value: stats.covariance,
              sample_size: stats.sample_size,
              classification: stats.classification
            })
          );
        }
      }
      if (pairs.length) windows[w.key] = pairs;
    }
    if (Object.keys(windows).length) {
      equipment.push({ equipment_id: eqId, windows });
    }
  }

  return {
    company_id: companyId,
    comparison_windows: Object.values(corrConfig.windows).map((w) => w.key),
    equipment,
    generated_at: new Date().toISOString(),
    source_table: 'plc_collected_data'
  };
}

/**
 * 43-F — Interaction score (associações fortes observadas, não risco).
 */
function computeEquipmentInteractionScore(correlations = [], context = {}) {
  const cfg = corrConfig.interaction_score;
  let score = 0;
  const factors = [];
  const strong = correlations.filter(
    (c) => c.classification === 'strong' || c.classification === 'very_strong'
  );
  const moderate = correlations.filter((c) => c.classification === 'moderate');

  for (const c of strong.slice(0, cfg.max_pairs_counted)) {
    if (c.classification === 'very_strong') {
      score += cfg.very_strong_points;
      factors.push(`very_strong_${c.signal_a}_${c.signal_b}`);
    } else {
      score += cfg.strong_points;
      factors.push(`strong_${c.signal_a}_${c.signal_b}`);
    }
  }
  for (const c of moderate.slice(0, Math.max(0, cfg.max_pairs_counted - strong.length))) {
    score += cfg.moderate_points;
    factors.push(`moderate_${c.signal_a}_${c.signal_b}`);
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let interaction_level = 'normal';
  if (score > cfg.levels.elevated_max) interaction_level = 'high';
  else if (score > cfg.levels.normal_max) interaction_level = 'elevated';

  return {
    equipment_id: context.equipment_id || correlations[0]?.equipment_id || null,
    interaction_score: score,
    interaction_level,
    strong_pairs_count: strong.length,
    factors,
    observational_only: true,
    no_causality_inferred: true
  };
}

async function buildOperationalCorrelationPack(companyId) {
  if (!companyId) {
    return {
      correlation_snapshot: { equipment: [] },
      equipment_interaction: [],
      source_table: 'plc_collected_data'
    };
  }

  const correlation_snapshot = await buildCorrelationSnapshot(companyId);
  const equipment_interaction = [];

  const seenEq = new Set();
  for (const eq of correlation_snapshot.equipment || []) {
    seenEq.add(eq.equipment_id);
    const allPairs = [];
    for (const w of Object.values(eq.windows || {})) {
      if (Array.isArray(w)) allPairs.push(...w);
    }
    equipment_interaction.push(
      computeEquipmentInteractionScore(allPairs, { equipment_id: eq.equipment_id })
    );
  }

  for (const eqId of await listEquipmentIds(companyId)) {
    if (!seenEq.has(eqId)) {
      equipment_interaction.push(
        computeEquipmentInteractionScore([], { equipment_id: eqId })
      );
    }
  }

  equipment_interaction.sort((a, b) => b.interaction_score - a.interaction_score);

  const flat = [];
  for (const eq of correlation_snapshot.equipment || []) {
    for (const pairs of Object.values(eq.windows || {})) {
      if (Array.isArray(pairs)) flat.push(...pairs);
    }
  }

  return {
    correlation_snapshot,
    equipment_interaction,
    correlation_pairs: flat,
    correlation_count: flat.length,
    source_table: 'plc_collected_data',
    generated_at: new Date().toISOString()
  };
}

function collectCorrelationEvidenceNumbers(pack = {}) {
  const evidence = new Set();
  const add = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return;
    const v = Number(n);
    evidence.add(String(v));
    evidence.add(String(Math.round(v * 1000) / 1000));
    evidence.add(String(Math.round(v * 100) / 100));
  };
  for (const p of pack.correlation_pairs || []) {
    add(p.correlation);
    add(p.pearson);
    add(p.spearman);
    add(p.sample_size);
  }
  for (const e of pack.equipment_interaction || []) {
    add(e.interaction_score);
  }
  return evidence;
}

function formatCorrelationForChat(pack = {}) {
  const snap = pack.correlation_snapshot;
  const pairs = pack.correlation_pairs || [];
  if (!pairs.length) return '';

  const lines = [
    'Correlações observáveis PLC (associação estatística — NÃO afirmar causa/causalidade):',
    `- Pares com associação reportada: ${pairs.length}`
  ];

  const top = pairs
    .filter((p) => p.classification === 'strong' || p.classification === 'very_strong')
    .slice(0, 8);
  const show = top.length ? top : pairs.slice(0, 6);

  for (const p of show) {
    lines.push(
      `  • ${p.equipment_id} [${p.window}]: ${p.signal_a} ↔ ${p.signal_b} — ` +
        `r=${p.correlation} (${p.classification}), n=${p.sample_size}`
    );
  }

  const inter = pack.equipment_interaction?.find((x) => x.interaction_score > 0);
  if (inter) {
    lines.push(
      `- Maior interaction_score observacional: ${inter.equipment_id} = ${inter.interaction_score}`
    );
  }

  return lines.join('\n');
}

function buildLiveFeedEvents(correlationPack = {}) {
  const events = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const pairs = (correlationPack.correlation_pairs || [])
    .filter((p) => p.classification === 'moderate' || p.classification === 'strong' || p.classification === 'very_strong')
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, corrConfig.feed.max_events);

  for (const p of pairs) {
    const feedType =
      p.classification === 'very_strong' || p.classification === 'strong'
        ? 'STRONG_SIGNAL_ASSOCIATION'
        : p.classification === 'moderate'
          ? 'CORRELATION_OBSERVED'
          : 'SIGNAL_CLUSTER_DETECTED';

    events.push({
      id: `plc-corr-${p.equipment_id}-${p.signal_a}-${p.signal_b}-${now.getTime()}`,
      time: timeStr,
      severity: p.classification === 'very_strong' ? 'medium' : 'low',
      type: feedType,
      message:
        `[PLC] ${p.equipment_id}: associação observada ${p.signal_a}↔${p.signal_b} ` +
        `(r=${p.correlation}, ${p.classification}, janela ${p.window})`,
      source_table: 'plc_collected_data',
      audit_evidence: p,
      verification_state: 'plc_observed'
    });
  }

  return events;
}

module.exports = {
  pearson,
  spearman,
  covariance,
  robustCorrelation,
  classifyCorrelation,
  buildCorrelationEvidence,
  buildCorrelationSnapshot,
  computeEquipmentInteractionScore,
  buildOperationalCorrelationPack,
  collectCorrelationEvidenceNumbers,
  formatCorrelationForChat,
  buildLiveFeedEvents
};
