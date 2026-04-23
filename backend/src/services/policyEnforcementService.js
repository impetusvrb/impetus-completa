'use strict';

const dataClassificationService = require('./dataClassificationService');
const complianceAnonymizerService = require('./complianceAnonymizerService');
const { unwrapRulesForEnforcement } = require('./policyHardeningService');

const POLICY_BLOCK_MSG =
  'Esta interação não está autorizada pelas políticas de IA da sua organização. Contacte o administrador IMPETUS ou o responsável interno.';

function stripDetail(text, maxLen) {
  if (typeof text !== 'string') return text;
  let t = text.replace(/\b\d{1,3}(?:\.\d{3})*(?:,\d{1,4})?\b/g, '[·]');
  if (t.length > maxLen) return `${t.slice(0, maxLen)}…`;
  return t;
}

/**
 * @param {object} synthesis
 * @param {object} dossier
 * @param {object} params
 * @param {string} params.module
 * @param {object} params.rules — regras fundidas
 * @param {object} params.policyMeta — { layers, policy_types }
 * @returns {{ effect: string, violation: boolean, violation_reason: string|null, policy_incident: object|null, policy_trace: object }}
 */
function applyPolicy(synthesis, dossier, params) {
  const rules = unwrapRulesForEnforcement(params.rules || {});
  const module = params.module || 'cognitive_council';
  const out = {
    effect: 'none',
    violation: false,
    violation_reason: null,
    policy_incident: null,
    policy_trace: {
      policy_applied: Object.keys(rules).length > 0,
      policy_source: (params.policyMeta?.layers || []).map((l) => l.scope),
      policy_effect: 'none',
      policy_type_layers: params.policyMeta?.layers || [],
      ...(params.policyMeta?.policy_enforcement &&
      (params.policyMeta.policy_enforcement.conflict_detected ||
        (params.policyMeta.policy_enforcement.affected_rules || []).length > 0)
        ? {
            conflict_detected: !!params.policyMeta.policy_enforcement.conflict_detected,
            resolved_by: params.policyMeta.policy_enforcement.resolved_by || undefined,
            affected_rules: params.policyMeta.policy_enforcement.affected_rules || []
          }
        : {})
    }
  };

  if (!synthesis || !rules || typeof rules !== 'object') {
    return out;
  }

  const list = rules.allowed_modules;
  if (Array.isArray(list) && list.length > 0) {
    const m = String(module).toLowerCase();
    const ok = list.some((x) => m.includes(String(x || '').toLowerCase()));
    if (!ok) {
      out.violation = true;
      out.violation_reason = 'module_not_allowed';
      out.effect = 'blocked';
      out.policy_trace.policy_effect = 'blocked';
      synthesis.answer = POLICY_BLOCK_MSG;
      if (typeof synthesis.content === 'string') synthesis.content = POLICY_BLOCK_MSG;
      synthesis.degraded = true;
      synthesis.requires_action = true;
      dossier.decision.requires_human_validation = true;
      out.policy_incident = {
        severity: 'HIGH',
        summary: `[POLICY_VIOLATION] Módulo "${module}" fora de allowed_modules.`
      };
      return out;
    }
  }

  const detail = String(rules.max_response_detail || rules.max_detail_level || '')
    .toLowerCase()
    .trim();
  if (detail === 'low') {
    const before = String(synthesis.answer || '');
    synthesis.answer = stripDetail(before, 1600);
    if (typeof synthesis.content === 'string') synthesis.content = synthesis.answer;
    out.effect = 'limited';
    out.policy_trace.policy_effect = 'limited';
  } else if (detail === 'medium') {
    const before = String(synthesis.answer || '');
    if (before.length > 4500) {
      synthesis.answer = `${before.slice(0, 4500)}…`;
      if (typeof synthesis.content === 'string') synthesis.content = synthesis.answer;
      out.effect = out.effect === 'none' ? 'limited' : out.effect;
      out.policy_trace.policy_effect = 'limited';
    }
  }

  if (rules.require_human_validation === true) {
    dossier.decision.requires_human_validation = true;
    synthesis.requires_action = true;
  }

  if (rules.block_sensitive_data === true) {
    const cl = dataClassificationService.classifyData({
      prompt: '',
      model_answer: String(synthesis.answer || '')
    });
    if (cl.contains_sensitive_data || cl.contains_personal_data) {
      const action = String(rules.sensitive_data_action || 'anonymize').toLowerCase();
      if (action === 'block') {
        synthesis.answer = POLICY_BLOCK_MSG;
        if (typeof synthesis.content === 'string') synthesis.content = POLICY_BLOCK_MSG;
        out.effect = 'blocked';
        out.policy_trace.policy_effect = 'blocked';
        out.violation = true;
        out.violation_reason = 'sensitive_blocked_by_policy';
        out.policy_incident = {
          severity: rules.policy_violation_severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          summary: `[POLICY_VIOLATION] Dados sensíveis na resposta bloqueados por política. Campos detetados: ${(cl.detected_fields || []).join(', ') || '—'}.`
        };
      } else {
        const before = String(synthesis.answer || '');
        synthesis.answer = complianceAnonymizerService.anonymizeSensitiveData(before);
        if (typeof synthesis.content === 'string') {
          synthesis.content = complianceAnonymizerService.anonymizeSensitiveData(synthesis.content);
        }
        out.effect = out.effect === 'blocked' ? 'blocked' : 'anonymized';
        out.policy_trace.policy_effect = out.policy_trace.policy_effect === 'limited' ? 'limited_anonymized' : 'anonymized';
      }
    }
  }

  if (out.policy_trace.policy_effect === 'none' && out.effect !== 'none') {
    out.policy_trace.policy_effect = out.effect;
  }

  return out;
}

module.exports = {
  applyPolicy,
  POLICY_BLOCK_MSG
};
