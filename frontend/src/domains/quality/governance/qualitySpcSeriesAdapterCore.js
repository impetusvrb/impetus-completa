/**
 * INC-033 — Funções puras do adapter SPC (sem dependência de API).
 */

export const SPC_EMPTY_MESSAGE = 'Sem dados suficientes';

/**
 * Normaliza resposta POST /intelligence/spc/screen para o SpcPanel (Baseline UI v1.0).
 */
export function normalizeSpcScreenResponse(data) {
  const r = data?.result ?? data;
  if (!r || r.ok === false) {
    return {
      data_available: false,
      reason: r?.reason || data?.error || 'spc_unavailable',
      empty_message: SPC_EMPTY_MESSAGE
    };
  }
  const lim = r.limits || {};
  const violationCount = r.violation_count ?? (Array.isArray(r.violations) ? r.violations.length : 0);
  return {
    data_available: true,
    xbar_average: lim.center ?? null,
    ucl: lim.ucl ?? null,
    lcl: lim.lcl ?? null,
    xbar_chart: {
      ucl: lim.ucl ?? null,
      lcl: lim.lcl ?? null,
      center: lim.center ?? null
    },
    violations_detected: violationCount > 0,
    out_of_control_points: violationCount > 0 ? violationCount : null,
    subgroup_stats: r.subgroup_stats || [],
    violation_count: violationCount,
    limits: lim,
    correlation_id: data?.correlation_id || null
  };
}

export function extractRuntimeSpcDriftMetrics(dashboardMe = null) {
  const report = dashboardMe?.cognitive_runtime_report || dashboardMe?.payload?.cognitive_runtime_report || null;
  const centers = report?.specialized_cockpit_runtime?.centers || report?.centers || [];
  const telemetry = centers.find((c) => c?.center_id === 'quality_telemetry_spc') || null;
  const metrics = telemetry?.metrics || telemetry?.payload?.metrics || {};
  return {
    drift_level: metrics.drift_level ?? metrics.drift ?? null,
    drift_confidence: metrics.drift_confidence ?? metrics.confidence ?? null,
    spc_subgroup_means: Array.isArray(metrics.spc_subgroup_means) ? metrics.spc_subgroup_means : [],
    data_available: telemetry != null
  };
}

export function validateSpcRuntimeCoherence(seriesBundle, runtimeDrift) {
  if (!seriesBundle?.data_available) {
    return { coherent: runtimeDrift?.data_available !== true, note: 'spc_series_empty' };
  }
  const subgroupCount = seriesBundle?.subgroup_meta?.subgroup_count ?? seriesBundle?.subgroups?.length ?? 0;
  const runtimeMeans = runtimeDrift?.spc_subgroup_means?.length ?? 0;
  if (runtimeMeans > 0 && subgroupCount > 0) {
    return { coherent: runtimeMeans === subgroupCount, subgroup_count: subgroupCount, runtime_means: runtimeMeans };
  }
  return { coherent: true, note: 'partial_coherence_check' };
}
