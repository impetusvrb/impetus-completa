'use strict';

/**
 * INC-033 — Adapter único de séries SPC a partir de datasets oficiais Qualidade.
 * Sem interpolação, sem curvas sintéticas, sem padding.
 */

const db = require('../../../../db');

const MIN_SUBGROUPS = 2;
const SUBGROUP_SIZE_CANDIDATES = [5, 4, 3, 2];
const INSPECTION_LIMIT = 500;
const TELEMETRY_LIMIT = 500;
const SNAPSHOT_LIMIT = 120;

/**
 * Agrupa medições cronológicas em subgrupos de tamanho fixo n (sem padding).
 * @param {number[]} measurements
 * @param {{ minSubgroups?: number }} opts
 */
function buildSubgroupsFromMeasurements(measurements, opts = {}) {
  const minSubgroups = opts.minSubgroups ?? MIN_SUBGROUPS;
  const values = (measurements || []).filter((x) => Number.isFinite(Number(x))).map((x) => Number(x));
  if (!values.length) {
    return { ok: false, reason: 'no_measurements', subgroups: [], subgroup_size: null, measurement_count: 0 };
  }

  for (const n of SUBGROUP_SIZE_CANDIDATES) {
    const count = Math.floor(values.length / n);
    if (count < minSubgroups) continue;
    const usable = count * n;
    const subgroups = [];
    for (let i = 0; i < count; i++) {
      subgroups.push(values.slice(i * n, (i + 1) * n));
    }
    return {
      ok: true,
      subgroups,
      subgroup_size: n,
      subgroup_count: count,
      measurement_count: usable,
      total_measurements: values.length,
      unused_trailing: values.length - usable
    };
  }

  return {
    ok: false,
    reason: 'insufficient_measurements',
    subgroups: [],
    subgroup_size: null,
    measurement_count: values.length
  };
}

async function loadInspectionMeasurements(companyId) {
  const empty = { has_data: false, measurements: [], source: 'quality_inspections' };
  if (!companyId) return empty;

  try {
    const r = await db.query(
      `SELECT id,
              COALESCE(inspection_date, created_at::date) AS measured_at,
              defects_count,
              rework_count,
              result
       FROM quality_inspections
       WHERE company_id = $1
         AND defects_count IS NOT NULL
       ORDER BY COALESCE(inspection_date, created_at::date) ASC, created_at ASC
       LIMIT $2`,
      [companyId, INSPECTION_LIMIT]
    );
    const rows = r.rows || [];
    const measurements = rows
      .map((row) => ({
        timestamp: row.measured_at,
        value: Number(row.defects_count),
        source: 'quality_inspections',
        inspection_id: row.id,
        result: row.result
      }))
      .filter((m) => Number.isFinite(m.value));

    return {
      has_data: measurements.length > 0,
      measurements,
      source: 'quality_inspections',
      count: measurements.length
    };
  } catch {
    return empty;
  }
}

async function loadIndicatorSnapshotSeries(companyId) {
  const empty = { has_data: false, measurements: [], source: 'quality_indicators_snapshot' };
  if (!companyId) return empty;

  try {
    const r = await db.query(
      `SELECT snapshot_date, defect_index, rework_index, conformity_rate
       FROM quality_indicators_snapshot
       WHERE company_id = $1
       ORDER BY snapshot_date ASC
       LIMIT $2`,
      [companyId, SNAPSHOT_LIMIT]
    );
    const measurements = (r.rows || [])
      .map((row) => {
        const value = Number(row.defect_index ?? row.rework_index);
        if (!Number.isFinite(value)) return null;
        return {
          timestamp: row.snapshot_date,
          value,
          source: 'quality_indicators_snapshot',
          conformity_rate: row.conformity_rate != null ? Number(row.conformity_rate) : null
        };
      })
      .filter(Boolean);

    return {
      has_data: measurements.length > 0,
      measurements,
      source: 'quality_indicators_snapshot',
      count: measurements.length
    };
  } catch {
    return empty;
  }
}

async function loadTelemetrySpcSeries(companyId) {
  const empty = { has_data: false, measurements: [], source: 'telemetry_timeseries_v1' };
  if (!companyId) return empty;

  try {
    const r = await db.query(
      `SELECT recorded_at, metric_key, value, unit
       FROM telemetry_timeseries_v1
       WHERE company_id = $1
         AND domain = 'quality'
         AND metric_key IN ('quality.spc_value', 'quality.defect_rate')
       ORDER BY recorded_at ASC
       LIMIT $2`,
      [companyId, TELEMETRY_LIMIT]
    );
    const measurements = (r.rows || [])
      .map((row) => ({
        timestamp: row.recorded_at,
        value: Number(row.value),
        source: 'telemetry_timeseries_v1',
        metric_key: row.metric_key,
        unit: row.unit || null
      }))
      .filter((m) => Number.isFinite(m.value));

    const spcOnly = measurements.filter((m) => m.metric_key === 'quality.spc_value');

    return {
      has_data: measurements.length > 0,
      measurements,
      spc_measurements: spcOnly,
      source: 'telemetry_timeseries_v1',
      count: measurements.length,
      spc_count: spcOnly.length
    };
  } catch {
    return empty;
  }
}

/**
 * Resolve subgrupos SPC a partir das fontes oficiais (prioridade: inspeções).
 */
function resolveSubgroupsFromBundles(inspectionBundle, telemetryBundle, snapshotBundle) {
  const sources = [];

  if (inspectionBundle.has_data) {
    const values = inspectionBundle.measurements.map((m) => m.value);
    const built = buildSubgroupsFromMeasurements(values);
    if (built.ok) {
      return {
        data_available: true,
        subgroups: built.subgroups,
        subgroup_size: built.subgroup_size,
        subgroup_count: built.subgroup_count,
        measurement_count: built.measurement_count,
        primary_source: 'quality_inspections',
        sources_used: ['quality_inspections']
      };
    }
    sources.push({ source: 'quality_inspections', reason: built.reason, count: values.length });
  }

  const spcTelemetry = telemetryBundle.spc_measurements || [];
  if (spcTelemetry.length > 0) {
    const values = spcTelemetry.map((m) => m.value);
    const built = buildSubgroupsFromMeasurements(values);
    if (built.ok) {
      return {
        data_available: true,
        subgroups: built.subgroups,
        subgroup_size: built.subgroup_size,
        subgroup_count: built.subgroup_count,
        measurement_count: built.measurement_count,
        primary_source: 'telemetry_timeseries_v1',
        sources_used: ['telemetry_timeseries_v1']
      };
    }
    sources.push({ source: 'telemetry_timeseries_v1', reason: built.reason, count: values.length });
  }

  if (snapshotBundle.has_data && snapshotBundle.measurements.length >= MIN_SUBGROUPS * 2) {
    const values = snapshotBundle.measurements.map((m) => m.value);
    const built = buildSubgroupsFromMeasurements(values);
    if (built.ok) {
      return {
        data_available: true,
        subgroups: built.subgroups,
        subgroup_size: built.subgroup_size,
        subgroup_count: built.subgroup_count,
        measurement_count: built.measurement_count,
        primary_source: 'quality_indicators_snapshot',
        sources_used: ['quality_indicators_snapshot']
      };
    }
    sources.push({ source: 'quality_indicators_snapshot', reason: built.reason, count: values.length });
  }

  return {
    data_available: false,
    subgroups: [],
    subgroup_size: null,
    subgroup_count: 0,
    measurement_count: 0,
    primary_source: null,
    sources_used: [],
    reason: 'insufficient_measurements',
    source_attempts: sources
  };
}

/**
 * Bundle completo para SPC — séries temporais reais + subgrupos derivados sem sintéticos.
 */
async function loadQualitySpcSeriesBundle(companyId) {
  const [inspectionBundle, snapshotBundle, telemetryBundle] = await Promise.all([
    loadInspectionMeasurements(companyId),
    loadIndicatorSnapshotSeries(companyId),
    loadTelemetrySpcSeries(companyId)
  ]);

  const subgroupResolution = resolveSubgroupsFromBundles(inspectionBundle, telemetryBundle, snapshotBundle);

  const datasetsPresent = [];
  const datasetsAbsent = ['quality_timeseries', 'quality_measurements', 'quality_telemetry_spc'];
  if (inspectionBundle.has_data) datasetsPresent.push('quality_inspections');
  if (snapshotBundle.has_data) datasetsPresent.push('quality_indicators_snapshot');
  if (telemetryBundle.has_data) datasetsPresent.push('telemetry_timeseries_v1');

  return {
    ok: true,
    company_id: companyId,
    data_available: subgroupResolution.data_available,
    subgroups: subgroupResolution.subgroups,
    subgroup_meta: {
      subgroup_size: subgroupResolution.subgroup_size,
      subgroup_count: subgroupResolution.subgroup_count,
      measurement_count: subgroupResolution.measurement_count,
      primary_source: subgroupResolution.primary_source,
      sources_used: subgroupResolution.sources_used,
      reason: subgroupResolution.reason || null,
      source_attempts: subgroupResolution.source_attempts || []
    },
    series: {
      inspections: inspectionBundle.measurements,
      indicators_snapshot: snapshotBundle.measurements,
      telemetry: telemetryBundle.measurements,
      telemetry_spc: telemetryBundle.spc_measurements || []
    },
    datasets: {
      present: datasetsPresent,
      absent: datasetsAbsent,
      quality_operational_metrics: 'runtime_only_not_table'
    },
    empty_message: subgroupResolution.data_available ? null : 'Sem dados suficientes'
  };
}

module.exports = {
  buildSubgroupsFromMeasurements,
  loadInspectionMeasurements,
  loadIndicatorSnapshotSeries,
  loadTelemetrySpcSeries,
  resolveSubgroupsFromBundles,
  loadQualitySpcSeriesBundle
};
