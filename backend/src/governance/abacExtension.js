'use strict';

/**
 * WAVE 7 — Extended ABAC Structure.
 * Attribute-Based Access Control sobre o RBAC existente.
 *
 * NÃO substitui nem altera o RBAC atual (users.role / JWT middleware).
 * É uma camada declarativa de políticas adicionais que pode ser
 * consultada por qualquer serviço. Modo inicial: observe-only.
 *
 * Atributos suportados: domain, tenant, workflow_type, time_window, device_context.
 * Decisão: allow | deny | abstain (como WAVE 5 policy primitives).
 */

const { ABAC_ENFORCE } = require('./governanceFlags');

/**
 * @typedef {{ allow: boolean, deny: boolean, abstain: boolean }} PolicyDecision
 * @typedef {{ id: string, description: string, evaluate: (subject, resource, environment) => PolicyDecision }} AbacPolicy
 */

const DECISION = Object.freeze({
  ALLOW: Object.freeze({ allow: true, deny: false, abstain: false }),
  DENY: Object.freeze({ allow: false, deny: true, abstain: false }),
  ABSTAIN: Object.freeze({ allow: false, deny: false, abstain: true })
});

/** @type {Map<string, AbacPolicy>} */
const _policies = new Map();

// ── Built-in policies ──────────────────────────────────────────────────────

/**
 * Política: workflows que requerem aprovação humana não podem ser iniciados por IA.
 */
_policies.set('no_ai_regulated_workflow', {
  id: 'no_ai_regulated_workflow',
  description: 'Workflows regulados não podem ser iniciados por actores IA.',
  evaluate(subject, resource) {
    if (subject.actor_type !== 'ai') return DECISION.ABSTAIN;
    const wfType = resource.workflow_type || '';
    const { getWorkflowCapability } = require('./workflowCapabilityMatrix');
    const cap = getWorkflowCapability(wfType);
    if (!cap) return DECISION.ABSTAIN;
    if (!cap.allowAiInitiated) {
      return DECISION.DENY;
    }
    return DECISION.ABSTAIN;
  }
});

/**
 * Política: tenant isolation — actor só pode operar sobre recursos do próprio tenant.
 */
_policies.set('tenant_isolation', {
  id: 'tenant_isolation',
  description: 'Actor não pode operar sobre recursos de tenant diferente.',
  evaluate(subject, resource) {
    if (!subject.company_id || !resource.company_id) return DECISION.ABSTAIN;
    if (String(subject.company_id) === String(resource.company_id)) return DECISION.ABSTAIN;
    return DECISION.DENY;
  }
});

/**
 * Política: domain isolation — actor só pode iniciar workflows do próprio domínio
 * se não tiver cross-domain capability.
 */
_policies.set('domain_actor_scope', {
  id: 'domain_actor_scope',
  description: 'Actor sem cross-domain não pode actuar em domínio diferente do seu.',
  evaluate(subject, resource) {
    if (!resource.domain) return DECISION.ABSTAIN;
    const hasCrossDomain =
      Array.isArray(subject.capabilities) && subject.capabilities.includes('cross_domain_access');
    if (hasCrossDomain) return DECISION.ABSTAIN;
    if (!subject.domain) return DECISION.ABSTAIN;
    if (subject.domain !== resource.domain) return DECISION.DENY;
    return DECISION.ABSTAIN;
  }
});

// ── Engine ──────────────────────────────────────────────────────────────────

/**
 * Regista uma política ABAC customizada.
 * @param {AbacPolicy} policy
 */
function registerAbacPolicy(policy) {
  if (!policy || !policy.id || typeof policy.evaluate !== 'function') {
    throw new Error('AbacPolicy requires id and evaluate()');
  }
  _policies.set(policy.id, policy);
}

/**
 * Avalia todas as políticas para um pedido.
 * Retorna { decision: 'allow'|'deny'|'abstain', violations: string[], mode: 'enforce'|'observe' }
 *
 * @param {{ actor_type?: string, company_id?: string, role?: string, capabilities?: string[], domain?: string }} subject
 * @param {{ workflow_type?: string, company_id?: string, domain?: string }} resource
 * @param {object} [environment]
 */
function evaluateAbacPolicies(subject, resource, environment = {}) {
  const violations = [];
  let explicitDeny = false;

  for (const policy of _policies.values()) {
    let decision;
    try {
      decision = policy.evaluate(subject, resource, environment);
    } catch (err) {
      decision = DECISION.ABSTAIN;
      console.warn('[ABAC] Policy "%s" threw:', policy.id, err?.message || err);
    }
    if (decision.deny) {
      explicitDeny = true;
      violations.push(policy.id);
    }
  }

  const finalDecision = explicitDeny ? 'deny' : 'allow';
  const mode = ABAC_ENFORCE ? 'enforce' : 'observe';

  if (explicitDeny) {
    const msg = `[ABAC_${mode.toUpperCase()}] Denied — violations: ${violations.join(', ')} subject=${JSON.stringify({ role: subject.role, actor_type: subject.actor_type })} resource=${JSON.stringify({ workflow_type: resource.workflow_type, domain: resource.domain })}`;
    console.warn(msg);
  }

  return {
    decision: finalDecision,
    violations,
    mode,
    // Em observe mode: nunca bloqueia o runtime — deixa passar mas regista.
    effectiveBlock: ABAC_ENFORCE && explicitDeny
  };
}

/**
 * Lista políticas registadas.
 */
function listAbacPolicies() {
  return Array.from(_policies.values()).map((p) => ({ id: p.id, description: p.description }));
}

module.exports = {
  DECISION,
  registerAbacPolicy,
  evaluateAbacPolicies,
  listAbacPolicies
};
