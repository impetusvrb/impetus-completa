'use strict';

const DESTRUCTIVE_RE = /\b(cancelar|excluir|demiss[aã]o|publicar|enviar para todos|escalar automaticamente)\b/i;
const COMMUNICATION_RE = /\b(enviar|encaminhar|comunicar|avisar|notificar)\b/i;
const ESCALATION_RE = /\b(escalar|supervisor|diretor|executivo|ceo)\b/i;

function classifyHitlRequirement(action = {}) {
  const text = String(action.summary || action.content || '').toLowerCase();
  const type = action.type || 'informational';

  if (type === 'escalation' || ESCALATION_RE.test(text)) {
    return { required: true, level: 'escalation', reason: 'hierarchy_sensitive' };
  }
  if (type === 'communication' || COMMUNICATION_RE.test(text)) {
    return { required: true, level: 'communication', reason: 'outbound_message' };
  }
  if (type === 'task_persist' || type === 'workflow_closure') {
    return { required: true, level: 'operational', reason: 'state_mutation' };
  }
  if (DESTRUCTIVE_RE.test(text)) {
    return { required: true, level: 'critical', reason: 'destructive_signal' };
  }
  return { required: true, level: 'standard', reason: 'assistive_default' };
}

function buildHitlEnvelope(action = {}, user = {}) {
  const req = classifyHitlRequirement(action);
  return {
    hitl_required: req.required,
    hitl_level: req.level,
    hitl_reason: req.reason,
    approval_required: true,
    auto_execution: false,
    approver_scope: {
      tenant_id: user.company_id || null,
      actor_id: user.id || null,
      role: user.role || null
    },
    validation_modality: ['TEXT', 'VOICE'],
    status: 'PENDING'
  };
}

module.exports = {
  classifyHitlRequirement,
  buildHitlEnvelope,
  DESTRUCTIVE_RE,
  COMMUNICATION_RE,
  ESCALATION_RE
};
