/**
 * INC-031 — Adapter: runtime quality_native (/dashboard/me) → sinais cognitivos.
 * Sem mocks, sem séries sintéticas — apenas dados já entregues pelo runtime Z.23.
 */
import { safeUUID } from '../../../utils/safeUuid.js';
import { resolveSpecializedCockpitRuntime } from '../../../cognitiveRuntime/cockpit/specializedCockpitResolver.js';

function findCenter(centers = [], centerId) {
  return centers.find((c) => c?.center_id === centerId) || null;
}

function asFiniteArray(value) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

/**
 * Extrai séries temporais reais expostas no cognitive_runtime_report (se existirem).
 */
function extractRawSeriesFromReport(meData = {}) {
  const blocks = meData?.cognitive_runtime_report?.quality_cockpit_pilot?.shadow_cognitive_cockpit?.blocks || [];
  const out = {
    process_values: [],
    defect_rates: [],
    spc_subgroup_means: [],
    supplier_rows: [],
    supplier_id: null
  };

  for (const block of blocks) {
    const metrics = block?.shadow_signals?.metrics;
    if (!metrics || typeof metrics !== 'object') continue;
    if (Array.isArray(metrics.process_values) && !out.process_values.length) {
      out.process_values = asFiniteArray(metrics.process_values);
    }
    if (Array.isArray(metrics.defect_rates) && !out.defect_rates.length) {
      out.defect_rates = asFiniteArray(metrics.defect_rates);
    }
    if (Array.isArray(metrics.spc_subgroup_means) && !out.spc_subgroup_means.length) {
      out.spc_subgroup_means = asFiniteArray(metrics.spc_subgroup_means);
    }
    if (Array.isArray(metrics.supplier_rows) && !out.supplier_rows.length) {
      out.supplier_rows = metrics.supplier_rows;
    }
    if (metrics.supplier_id && !out.supplier_id) {
      out.supplier_id = String(metrics.supplier_id);
    }
  }

  return out;
}

/**
 * @param {object} meData — payload /dashboard/me
 * @returns {{ connected: boolean, runtime: object|null, centers: object[] }}
 */
export function resolveQualityRuntimeContext(meData = {}) {
  const resolved = resolveSpecializedCockpitRuntime(meData);
  return {
    connected: resolved?.runtime?.consolidation_applied === true,
    runtime: resolved?.runtime || null,
    centers: resolved?.centers || meData?.quality_cognitive_centers || [],
    decisionSupport: resolved?.decisionSupport || meData?.quality_decision_support || null,
    operationalMetrics: meData?.quality_operational_metrics || null,
    insights: Array.isArray(meData?.quality_insights) ? meData.quality_insights : [],
    report: meData?.cognitive_runtime_report || null
  };
}

/**
 * Sinais para POST /quality-cognitive/insights/run — apenas campos reais.
 * @param {object} meData
 */
export function buildCognitiveSignalsFromRuntime(meData = {}) {
  const ctx = resolveQualityRuntimeContext(meData);
  const reportSeries = extractRawSeriesFromReport(meData);
  const operational = findCenter(ctx.centers, 'quality_operational_nc');
  const governance = findCenter(ctx.centers, 'quality_governance');
  const om = ctx.operationalMetrics?.metrics || {};

  const recurrence_records = [];
  const recurrenceKey = operational?.metrics?.recurrence_key || om.dominant_recurrence_key;
  if (recurrenceKey) {
    recurrence_records.push({
      entity_type: 'inspection',
      entity_id: String(recurrenceKey).slice(0, 120),
      kind: 'recurrence',
      occurred_at: new Date().toISOString()
    });
  }

  const supplier_id =
    reportSeries.supplier_id ||
    (governance?.metrics?.supplier_id != null ? String(governance.metrics.supplier_id) : null);

  return {
    process_values: reportSeries.process_values,
    defect_rates: reportSeries.defect_rates,
    spc_subgroup_means: reportSeries.spc_subgroup_means,
    recurrence_records,
    supplier_id,
    supplier_rows: reportSeries.supplier_rows,
    usl: null,
    lsl: null,
    correlation_id: safeUUID()
  };
}

/** @param {ReturnType<typeof buildCognitiveSignalsFromRuntime>} signals */
export function hasSufficientSignalsForRunInsights(signals = {}) {
  return (
    (signals.process_values?.length || 0) >= 8 ||
    (signals.recurrence_records?.length || 0) >= 2 ||
    (signals.supplier_rows?.length || 0) > 0 ||
    (signals.defect_rates?.length || 0) >= 6
  );
}

/**
 * Pacote de visualização derivado do runtime (sem IA fictícia).
 * @param {object} meData
 */
export function buildRuntimeInsightPack(meData = {}) {
  const ctx = resolveQualityRuntimeContext(meData);
  const telemetry = findCenter(ctx.centers, 'quality_telemetry_spc');
  const governance = findCenter(ctx.centers, 'quality_governance');
  const narrativeCenter = findCenter(ctx.centers, 'quality_narrative');
  const om = ctx.operationalMetrics?.metrics || {};

  const drift =
    telemetry?.metrics?.drift_severity != null
      ? {
          ok: true,
          drift_severity: telemetry.metrics.drift_severity,
          drift_confidence: telemetry.metrics.drift_confidence ?? null,
          slope_per_step: telemetry.metrics.dimensional_trend ?? null,
          source: 'z23_runtime'
        }
      : { ok: false, reason: 'insufficient_telemetry' };

  const predictive_risk_score =
    om.deterioration_score != null
      ? Number(om.deterioration_score)
      : ctx.runtime?.cognitive_health?.specialization != null
        ? Number(ctx.runtime.cognitive_health.specialization)
        : null;

  const supplier =
    governance?.metrics?.supplier_score != null
      ? {
          ok: true,
          supplier_id: governance.metrics.supplier_id || 'tenant-supplier',
          trend:
            governance.metrics.supplier_risk === 'high' || governance.metrics.supplier_risk === 'worsening'
              ? 'worsening'
              : governance.metrics.supplier_risk === 'improving'
                ? 'improving'
                : 'stable',
          base_scorecard: {
            quality_score_0_100: governance.metrics.supplier_score,
            total_inspected: governance.metrics.total_inspected ?? null,
            defect_rate: governance.metrics.defect_rate ?? null
          },
          source: 'z23_runtime'
        }
      : { ok: false, reason: 'supplier_unavailable' };

  const insightRecs = (ctx.insights || []).map((i) => ({
    kind: i.id || i.title || 'insight',
    priority: i.priority || 'medium',
    rationale: i.body || i.summary || ''
  }));

  const questionRecs = (ctx.decisionSupport?.questions || []).slice(0, 4).map((q) => ({
    kind: q.id || 'assistive',
    priority: 'assistive',
    rationale: q.text || ''
  }));

  const recommendations = [...insightRecs, ...questionRecs].filter((r) => r.rationale);

  const narrative =
    narrativeCenter?.ok && (narrativeCenter.headline || narrativeCenter.text || narrativeCenter.summary)
      ? {
          headline: narrativeCenter.headline || narrativeCenter.label || 'Qualidade operacional',
          paragraphs: [
            ...(narrativeCenter.text ? [narrativeCenter.text] : []),
            ...(narrativeCenter.summary && narrativeCenter.summary !== narrativeCenter.text
              ? [narrativeCenter.summary]
              : [])
          ].filter(Boolean)
        }
      : null;

  return {
    engines: { drift, supplier },
    risk: predictive_risk_score != null ? { predictive_risk_score, source: 'z23_runtime' } : null,
    recommendations: recommendations.length ? { recommendations } : null,
    narrative,
    unavailable: {
      drift: !drift.ok,
      supplier: !supplier.ok,
      narrative: !narrative,
      recommendations: !recommendations.length
    }
  };
}

/**
 * Funde pack runtime (prioritário) com resposta opcional do motor cognitivo.
 * Motores API só substituem quando retornam ok com dados reais.
 */
export function mergeRuntimeAndApiPacks(runtimePack = {}, apiPack = null) {
  if (!apiPack) return runtimePack;

  const engines = { ...runtimePack.engines };
  if (apiPack.engines?.drift?.ok) engines.drift = apiPack.engines.drift;
  if (apiPack.engines?.supplier?.ok) engines.supplier = apiPack.engines.supplier;

  return {
    engines,
    risk: apiPack.risk?.predictive_risk_score != null ? apiPack.risk : runtimePack.risk,
    recommendations: apiPack.recommendations?.recommendations?.length
      ? apiPack.recommendations
      : runtimePack.recommendations,
    narrative: apiPack.narrative?.headline ? apiPack.narrative : runtimePack.narrative,
    unavailable: {
      drift: !engines.drift?.ok,
      supplier: !engines.supplier?.ok,
      narrative: !(apiPack.narrative?.headline || runtimePack.narrative?.headline),
      recommendations: !(
        apiPack.recommendations?.recommendations?.length || runtimePack.recommendations?.recommendations?.length
      )
    }
  };
}
