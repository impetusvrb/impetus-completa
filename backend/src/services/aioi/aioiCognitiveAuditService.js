'use strict';

/**
 * AIOI-P9.4 — Cognitive Audit Framework Service
 *
 * Especificação de auditoria cognitiva futura — READ ONLY, sem gravações.
 * Spec: backend/docs/AIOI_COGNITIVE_AUDIT_SPECIFICATION.md
 */

const LAYER = 'AIOI_COGNITIVE_AUDIT';

const AUDIT_REQUIREMENTS = [
  { id: 'CA-A01', requirement: 'Toda ação cognitiva futura deve gerar trace imutável' },
  { id: 'CA-A02', requirement: 'Correlacionar trace com correlation_id IOE' },
  { id: 'CA-A03', requirement: 'Registar company_id em todo evento cognitivo' },
  { id: 'CA-A04', requirement: 'Proibir execução sem audit trail completo' },
  { id: 'CA-A05', requirement: 'Retenção mínima alinhada a política enterprise' }
];

const EVIDENCE_REQUIREMENTS = [
  { id: 'CA-E01', requirement: 'Evidências devem referenciar truth_state' },
  { id: 'CA-E02', requirement: 'Scores provisórios marcados quando truth != grounded' },
  { id: 'CA-E03', requirement: 'Sem afirmações inventadas em narrativa' },
  { id: 'CA-E04', requirement: 'Fonte de dados explícita em todo output cognitivo' }
];

const TRACEABILITY_REQUIREMENTS = [
  { id: 'CA-T01', requirement: 'IOE → decision → execution → outcome encadeado' },
  { id: 'CA-T02', requirement: 'workflow_instance_id rastreável' },
  { id: 'CA-T03', requirement: 'execution_trace_id propagado' },
  { id: 'CA-T04', requirement: 'Sem decisão cognitiva órfã' }
];

const APPROVAL_REQUIREMENTS = [
  { id: 'CA-P01', requirement: 'HITL obrigatório para execução' },
  { id: 'CA-P02', requirement: 'approved_by_user_id em toda execução' },
  { id: 'CA-P03', requirement: 'Nenhuma auto-execução de critical' },
  { id: 'CA-P04', requirement: 'Rollback path documentado antes de execução' }
];

/**
 * Framework de auditoria cognitiva — especificação only.
 * @returns {object}
 */
function getCognitiveAuditFramework() {
  return {
    ok: true,
    layer: LAYER,
    audit_requirements:         AUDIT_REQUIREMENTS,
    evidence_requirements:      EVIDENCE_REQUIREMENTS,
    traceability_requirements:  TRACEABILITY_REQUIREMENTS,
    approval_requirements:      APPROVAL_REQUIREMENTS,
    recording_enabled:          false,
    specification_only:         true,
    total_requirements: (
      AUDIT_REQUIREMENTS.length
      + EVIDENCE_REQUIREMENTS.length
      + TRACEABILITY_REQUIREMENTS.length
      + APPROVAL_REQUIREMENTS.length
    ),
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getCognitiveAuditFramework,
  LAYER
};
