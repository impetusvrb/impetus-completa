'use strict';

/**
 * Catálogo declarativo de eventos industriais — vocabulário `<domain>.<entity>.<verb>`.
 * Aditivo: não substitui EVENT_TYPES do envelope v2 legado.
 */

const DOMAINS = Object.freeze([
  'quality',
  'safety',
  'environment',
  'logistics',
  'platform',
  'cognitive',
  'operational'
]);

const INDUSTRIAL_EVENT_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

/** Entradas canónicas (extensível sem breaking change). */
const CATALOG_ENTRIES = Object.freeze([
  { type: 'quality.ncr.opened', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.ncr.closed', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.capa.created', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.capa.verified', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.capa.extended', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.spc.sample_recorded', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.inspection.started', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.inspection.saved', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.inspection.completed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.evidence.attached', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.offline.sync_started', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.offline.sync_completed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.scan.performed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.kiosk.session_started', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.kiosk.session_closed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.spc.violation_detected', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.capa.risk_escalated', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.supplier.score_changed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.audit.reconstructed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.executive.insight_generated', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.risk.threshold_exceeded', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.analytics.pattern_detected', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.inspection.failed', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.anomaly.detected', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.supplier.deviated', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.calibration.expired', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.process.drift_detected', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.audit.completed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.risk.escalated', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.risk.acknowledged', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.pdca.phase_advanced', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.pdca.closed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.workflow.transition', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.workflow.approved', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.workflow.rejected', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.workflow.resubmitted', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.operational_hint', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.governance_analysis', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.telemetry.sample_ingested', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.telemetry.batch_ingested', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.telemetry.range_breached', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.cognitive.drift_predicted', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.recurrence_detected', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.supplier_score_changed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.anomaly_predicted', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.cognitive.process_deterioration_detected', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.cognitive.recommendation_generated', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.executive_insight_generated', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.cognitive.risk_escalated', domain: 'quality', critical: true, version: 1 },
  { type: 'quality.cognitive.pattern_detected', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.tenant_stage_changed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.plant_stage_changed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.workflow_enabled', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.readiness_blocked', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.maturity_changed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.saturation_detected', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.recommendation_suppressed', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.cognitive_ready', domain: 'quality', critical: false, version: 1 },
  { type: 'quality.rollout.activation_approved', domain: 'quality', critical: false, version: 1 },
  { type: 'safety.permit.issued', domain: 'safety', critical: true, version: 1 },
  { type: 'safety.loto.applied', domain: 'safety', critical: true, version: 1 },
  { type: 'safety.incident.reported', domain: 'safety', critical: true, version: 1 },
  { type: 'environment.emission.snapshot', domain: 'environment', critical: false, version: 1 },
  { type: 'environment.waste.shipment', domain: 'environment', critical: false, version: 1 },
  { type: 'logistics.wave.started', domain: 'logistics', critical: false, version: 1 },
  { type: 'logistics.dock.assigned', domain: 'logistics', critical: false, version: 1 },
  { type: 'platform.tenant.throttled', domain: 'platform', critical: false, version: 1 },
  { type: 'platform.outbox.drained', domain: 'platform', critical: false, version: 1 },
  { type: 'cognitive.llm.execution', domain: 'cognitive', critical: false, version: 1 },
  { type: 'cognitive.safety.block', domain: 'cognitive', critical: true, version: 1 },
  { type: 'operational.ingestion.completed', domain: 'operational', critical: false, version: 1 },
  { type: 'operational.pipeline.stage', domain: 'operational', critical: false, version: 1 }
]);

const _byType = new Map(CATALOG_ENTRIES.map((e) => [e.type, e]));

function parseIndustrialEventType(type) {
  const t = String(type || '').trim().toLowerCase();
  if (!INDUSTRIAL_EVENT_PATTERN.test(t)) return null;
  const [domain, entity, verb] = t.split('.');
  return { type: t, domain, entity, verb };
}

function isKnownIndustrialType(type) {
  return _byType.has(String(type || '').trim().toLowerCase());
}

function getCatalogEntry(type) {
  return _byType.get(String(type || '').trim().toLowerCase()) || null;
}

function listByDomain(domain) {
  const d = String(domain || '').trim().toLowerCase();
  return CATALOG_ENTRIES.filter((e) => e.domain === d);
}

/**
 * @param {string} type
 * @param {{ strict?: boolean }} [opts]
 * @returns {{ ok: boolean, entry?: object, reason?: string }}
 */
function validateCatalogType(type, opts = {}) {
  const parsed = parseIndustrialEventType(type);
  if (!parsed) {
    return { ok: false, reason: 'invalid_pattern' };
  }
  if (!DOMAINS.includes(parsed.domain)) {
    return { ok: false, reason: 'unknown_domain' };
  }
  const entry = getCatalogEntry(parsed.type);
  if (!entry && opts.strict) {
    return { ok: false, reason: 'not_in_catalog' };
  }
  return { ok: true, entry: entry || { type: parsed.type, domain: parsed.domain, critical: false, version: 1 } };
}

function getCatalogSnapshot() {
  return {
    domains: [...DOMAINS],
    entries_count: CATALOG_ENTRIES.length,
    entries: CATALOG_ENTRIES.map((e) => ({ ...e }))
  };
}

module.exports = {
  DOMAINS,
  INDUSTRIAL_EVENT_PATTERN,
  CATALOG_ENTRIES,
  parseIndustrialEventType,
  isKnownIndustrialType,
  getCatalogEntry,
  listByDomain,
  validateCatalogType,
  getCatalogSnapshot
};
