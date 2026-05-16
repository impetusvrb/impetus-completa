'use strict';

const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');
const { buildAuditEnvelope } = require('../audit/qualityCognitiveAuditEnvelope');

const RECO_KINDS = [
  'increase_inspection_frequency',
  'review_supplier',
  'recalibrate_equipment',
  'review_setup',
  'increase_sampling',
  'verify_operator_training',
  'review_process_parameters',
  'advance_maintenance_window',
  'strengthen_capa_containment',
  'monitor_spc_subgroup_size'
];

/**
 * Recomendações apenas assistivas — sem execução nem autoridade.
 */
function buildRecommendations(findings = [], ctx = {}) {
  const out = [];
  const companyId = ctx.company_id;
  const userId = ctx.user_id;
  const correlationId = ctx.correlation_id;

  for (const f of findings) {
    if (!f || typeof f !== 'object') continue;
    const kind = f.kind != null ? String(f.kind) : '';
    if (!RECO_KINDS.includes(kind)) continue;
    const confidence = f.confidence != null ? Math.max(0, Math.min(1, Number(f.confidence))) : 0.5;
    out.push({
      kind,
      priority: f.priority === 'high' ? 'high' : f.priority === 'low' ? 'low' : 'medium',
      rationale: String(f.rationale || ''),
      evidence_list: Array.isArray(f.evidence_list) ? f.evidence_list.slice(0, 20) : [],
      linked_signals: Array.isArray(f.linked_signals) ? f.linked_signals.slice(0, 12) : [],
      confidence,
      explainability: buildCognitiveExplainability({
        rationale: f.rationale,
        evidence: f.evidence_list,
        confidence,
        origin: 'quality_contextual_recommendation_engine',
        related_event_hints: f.related_event_hints || []
      }),
      audit: buildAuditEnvelope({
        companyId,
        userId,
        correlationId,
        engineId: 'qualityContextualRecommendationEngine',
        payloadSummary: { kind, priority: f.priority }
      }),
      human_acceptance_required: true
    });
  }

  return {
    ok: true,
    recommendations: out,
    emit_event: out.length > 0,
    explainability: buildCognitiveExplainability({
      rationale: `${out.length} recomendação(ões) derivadas exclusivamente de sinais observados (sem decisão automática).`,
      evidence: out.map((r) => r.kind).slice(0, 20),
      confidence: out.length ? 0.75 : 0.2,
      origin: 'quality_contextual_recommendation_engine'
    })
  };
}

module.exports = { buildRecommendations, RECO_KINDS };
