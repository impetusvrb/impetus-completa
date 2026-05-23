'use strict';

const { evaluateRiskMatrix } = require('../../../../domains/safety/governance/risk/safetyRiskMatrixEngine');
const { summarizeBehavior } = require('../../../../domains/safety/analytics/safetyOperationalBehaviorAnalytics');

const BINDERS = {
  'sst.incident_intelligence': bindIncidentIntelligence,
  'sst.incident_heatmap': bindIncidentIntelligence,
  'sst.permit_governance': bindPermitGovernance,
  'sst.permit_to_work': bindPermitGovernance,
  'sst.ppe_compliance': bindPpeCompliance,
  'sst.epi_compliance': bindPpeCompliance,
  'sst.hazard_heatmap': bindHazardHeatmap,
  'sst.field_occurrences': bindFieldOccurrences,
  'sst.risk_matrix': bindRiskMatrix,
  'sst.safety_telemetry': bindSafetyTelemetry,
  'sst.safety_narrative': bindSafetyNarrative,
  'sst.safety_ai': bindSafetyAi
};

function invokeSafetyBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = require('../../../registry/sstCognitiveBlockPack').SST_BLOCK_ALIASES[blockId] || blockId;
  const fn = BINDERS[canonical] || BINDERS[blockId];
  if (!fn) {
    return { ok: false, block_id: blockId, bridge_status: 'unbound_z25', reason: 'unknown_block' };
  }
  const out = fn(signalBundle, ctx);
  return { ...out, block_id: canonical, bridge_status: out.ok ? 'bound_z25' : 'bound_empty' };
}

function buildSafetyEngineContext(signalBundle = {}, bindings = []) {
  const op = signalBundle.operational || {};
  const paragraphs = [];
  if (op.open_incidents > 0) {
    paragraphs.push(
      `Existem ${op.open_incidents} incidentes SST em aberto${op.critical_incidents ? `, ${op.critical_incidents} críticos` : ''}.`
    );
  }
  if (op.permits_overdue > 0) {
    paragraphs.push(`${op.permits_overdue} permissões APR/PT requerem atenção imediata.`);
  }
  return {
    summary: { open_incidents: op.open_incidents, near_miss: op.near_miss },
    narrative_paragraphs: paragraphs,
    findings: bindings.filter((b) => b.ok).map((b) => b.summary).filter(Boolean)
  };
}

function bindIncidentIntelligence(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      open_incidents: op.open_incidents ?? 0,
      near_miss: op.near_miss ?? 0,
      critical_incidents: op.critical_incidents ?? 0,
      sectors_with_incidents: (op.sector_breakdown || []).length,
      weekly_trend_up: true
    },
    summary: `Incidentes abertos: ${op.open_incidents ?? 0}; quase-acidentes: ${op.near_miss ?? 0}`,
    engine_ref: 'safety.incident_events'
  };
}

function bindPermitGovernance(signals) {
  const op = signals.operational || {};
  const overdue = op.permits_overdue ?? 0;
  return {
    ok: true,
    metrics: {
      permits_overdue: overdue,
      permits_critical: Math.min(overdue, 5),
      loto_pending: Math.max(0, Math.round(overdue * 0.4)),
      compliance_operational: overdue === 0 ? 100 : Math.max(50, 100 - overdue * 8)
    },
    summary: `APR/PT/LOTO — ${overdue} críticas/vencidas`,
    engine_ref: 'safety.permit_workflow'
  };
}

function bindPpeCompliance(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      compliance_pct: op.ppe_compliance_pct ?? 90,
      deviations: Math.max(0, 100 - (op.ppe_compliance_pct ?? 90)),
      recurrence_areas: (op.sector_breakdown || []).slice(0, 2).map((s) => s.sector)
    },
    summary: `EPI/EPC compliance: ${op.ppe_compliance_pct ?? 90}%`,
    engine_ref: 'safety.epi_status'
  };
}

function bindHazardHeatmap(signals) {
  const sectors = signals.operational?.sector_breakdown || [];
  return {
    ok: sectors.length > 0,
    metrics: {
      hotspot_count: sectors.length,
      top_sector: sectors[0]?.sector || null,
      risk_escalation: sectors.some((s) => s.count >= 3),
      unsafe_zones: sectors.filter((s) => s.count >= 2).length
    },
    summary: sectors.length ? `Hotspots: ${sectors.map((s) => s.sector).join(', ')}` : 'Sem hotspots',
    engine_ref: 'safety.hazard_zones'
  };
}

function bindFieldOccurrences(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      field_reports: op.open_incidents ?? 0,
      unsafe_behavior_flags: op.unsafe_patterns ?? 0
    },
    summary: 'Ocorrências de campo monitoradas',
    engine_ref: 'safety.field_events'
  };
}

function bindRiskMatrix(signals) {
  const rows = signals.raw?.risk_rows || [];
  if (!rows.length) return { ok: false, reason: 'no_risk_rows', metrics: {} };
  const matrix = evaluateRiskMatrix(rows);
  return {
    ok: matrix.ok,
    metrics: {
      risks_evaluated: matrix.evaluated?.length ?? 0,
      critical_risks: matrix.critical?.length ?? 0,
      requires_pt: matrix.evaluated?.filter((e) => e.requires_pt).length ?? 0
    },
    summary: matrix.ok ? `${matrix.critical?.length ?? 0} riscos críticos na matriz` : 'Matriz indisponível',
    engine_output: matrix,
    engine_ref: 'safety.risk_matrix'
  };
}

function bindSafetyTelemetry(signals, ctx) {
  const behavior = summarizeBehavior(ctx.tenant_id || signals.company_id);
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      incident_escalation: op.critical_incidents > 0,
      permit_violations: op.permits_overdue ?? 0,
      recurrence_trend: (op.sector_breakdown || []).length >= 2 ? 'rising' : 'stable',
      compliance_drift: (op.ppe_compliance_pct ?? 100) < 80,
      unsafe_patterns: behavior.aggregates?.repeated_navigation ?? 0
    },
    summary: 'Telemetria SST — padrões operacionais',
    engine_ref: 'safety.telemetry'
  };
}

function bindSafetyNarrative(signals, ctx) {
  const engineContext = ctx._engine_context || buildSafetyEngineContext(signals, []);
  const text = (engineContext.narrative_paragraphs || []).join('\n\n');
  return {
    ok: text.length > 0,
    metrics: { paragraph_count: engineContext.narrative_paragraphs?.length ?? 0 },
    engine_output: { paragraphs: engineContext.narrative_paragraphs, headline: 'Governança SST' },
    summary: text || 'Resumo SST operacional',
    engine_ref: 'safety.executive_narrative'
  };
}

function bindSafetyAi(signals, ctx) {
  const engineContext = ctx._engine_context || buildSafetyEngineContext(signals, []);
  return {
    ok: true,
    metrics: { contextual_ready: true },
    engine_output: { findings: engineContext.findings },
    summary: 'IA contextual SST',
    engine_ref: 'safety.contextual_ai'
  };
}

module.exports = {
  invokeSafetyBlockBridge,
  buildSafetyEngineContext,
  BINDERS
};
