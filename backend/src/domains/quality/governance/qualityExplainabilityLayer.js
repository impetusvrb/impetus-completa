'use strict';

/**
 * Camada de explainability para o runtime de governação (sem alterar motor de IA existente).
 */

function buildGovernanceNarrativeFrame(input = {}) {
  const layer = input.origin_layer || 'governance';
  const governance_slots = {
    context: input.context != null ? input.context : null,
    origin: input.origin != null ? input.origin : null,
    rationale: input.rationale != null ? input.rationale : null,
    evidence_refs: Array.isArray(input.evidence_refs) ? input.evidence_refs : [],
    risk: input.risk != null ? input.risk : null,
    operational_impact: input.operational_impact != null ? input.operational_impact : null
  };
  return {
    schema_version: 1,
    layer,
    signals: Array.isArray(input.signals) ? input.signals : [],
    factors: Array.isArray(input.factors) ? input.factors : [],
    confidence: input.confidence != null ? Number(input.confidence) : null,
    governance_slots,
    references: {
      correlation_id: input.correlation_id || null,
      workflow_id: input.workflow_id || null
    }
  };
}

/** Validação estrutural pós-política (readiness / shadow) — não bloqueia publicação legada. */
function validateExplainabilityCompleteness(input = {}) {
  const frame = buildGovernanceNarrativeFrame(input);
  const g = frame.governance_slots;
  const requiredKeys = [
    'context',
    'origin',
    'rationale',
    'evidence_refs',
    'risk',
    'operational_impact'
  ];
  const missing = [];
  for (const k of requiredKeys) {
    const v = g[k];
    if (v == null || (k === 'evidence_refs' && (!Array.isArray(v) || v.length === 0))) {
      missing.push(k);
    }
  }
  return { ok: missing.length === 0, missing, frame };
}

async function publishGovernanceAnalysis(companyId, payload, meta = {}) {
  const crypto = require('crypto');
  const { publishQualityIndustrialEvent } = require('../events/qualityEventPublisher');
  const correlation_id = meta.correlation_id || crypto.randomUUID();
  return publishQualityIndustrialEvent(
    {
      event_name: 'quality.cognitive.governance_analysis',
      company_id: companyId,
      correlation_id,
      trace_id: meta.trace_id || correlation_id,
      workflow_id: meta.workflow_id != null ? String(meta.workflow_id) : null,
      idempotency_key: meta.idempotency_key || `quality_gov_analysis:${correlation_id}:${companyId}`,
      payload:
        payload && typeof payload === 'object'
          ? { narrative_frame: buildGovernanceNarrativeFrame(payload), ...payload }
          : { narrative_frame: buildGovernanceNarrativeFrame() }
    },
    {
      origin_layer: 'governance',
      intended_audience: meta.intended_audience || 'executive',
      user_id: meta.user_id
    }
  );
}

module.exports = {
  buildGovernanceNarrativeFrame,
  validateExplainabilityCompleteness,
  publishGovernanceAnalysis
};
