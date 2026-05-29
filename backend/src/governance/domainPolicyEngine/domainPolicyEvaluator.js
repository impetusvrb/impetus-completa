'use strict';

/**
 * Domain Policy Evaluator — Versioned, Deterministic, Multi-tenant.
 *
 * Avalia regras formais para Safety (Z.25) e Environment (P1) antes de qualquer
 * publicação, activação ou acesso a dados reais.
 *
 * Princípios:
 *   - Determinístico: mesmo input → mesmo output, sem side effects.
 *   - Versionado: cada policy tem version semântica.
 *   - Extensível: regras JSON carregadas de ficheiro + BD (tenant override).
 *   - Nunca executa: apenas classifica ALLOW | DENY | REQUIRE_APPROVAL.
 *
 * Flag: IMPETUS_DOMAIN_POLICY_ENGINE=off|shadow|on
 *   off    → fallback seguro (REQUIRE_APPROVAL para tudo)
 *   shadow → avalia mas não bloqueia (log only)
 *   on     → enforcement real
 */

const path = require('path');
const fs = require('fs');

const RISK_ORDER = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });

let _safetyPolicies = null;
let _environmentPolicies = null;

function _loadJsonPolicies(domain) {
  const dir = path.join(__dirname, 'policies', domain);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const all = [];
  for (const f of files) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (Array.isArray(content)) all.push(...content);
    else all.push(content);
  }
  return all;
}

function _getPolicies(domain) {
  if (domain === 'safety') {
    if (!_safetyPolicies) _safetyPolicies = _loadJsonPolicies('safety');
    return _safetyPolicies;
  }
  if (domain === 'environment') {
    if (!_environmentPolicies) _environmentPolicies = _loadJsonPolicies('environment');
    return _environmentPolicies;
  }
  return [];
}

function _matchCondition(cond, input) {
  const fieldVal = input[cond.field];
  switch (cond.operator) {
    case 'eq': return fieldVal === cond.value;
    case 'neq': return fieldVal !== cond.value;
    case 'in': return Array.isArray(cond.value) && cond.value.includes(fieldVal);
    case 'gte': {
      const fRisk = RISK_ORDER[String(fieldVal).toLowerCase()] || 0;
      const cRisk = RISK_ORDER[String(cond.value).toLowerCase()] || 0;
      return fRisk >= cRisk;
    }
    case 'gt': return Number(fieldVal) > Number(cond.value);
    case 'lt': return Number(fieldVal) < Number(cond.value);
    default: return false;
  }
}

function _policyMatches(policy, input) {
  if (!Array.isArray(policy.conditions) || policy.conditions.length === 0) return false;
  return policy.conditions.every(cond => _matchCondition(cond, input));
}

function _mode() {
  const v = String(process.env.IMPETUS_DOMAIN_POLICY_ENGINE || 'off').toLowerCase();
  if (['on', 'shadow', 'off'].includes(v)) return v;
  return 'off';
}

/**
 * @typedef {{ domain: string, action_type: string, user_role: string, risk_level: string, runtime_mode: string, company_id?: string }} PolicyInput
 * @typedef {{ result: 'ALLOW'|'DENY'|'REQUIRE_APPROVAL', policies_triggered: object[], explanation: string, engine_version: string, deterministic: boolean, mode: string }} PolicyOutput
 */

/**
 * Avalia todas as policies aplicáveis ao input fornecido.
 * @param {PolicyInput} input
 * @returns {PolicyOutput}
 */
function evaluate(input) {
  const mode = _mode();
  const domain = String(input.domain || '').toLowerCase();
  const policies = _getPolicies(domain);
  const triggered = [];

  for (const policy of policies) {
    if (_policyMatches(policy, input)) {
      triggered.push({
        policy_id: policy.policy_id,
        version: policy.version,
        severity: policy.severity,
        requires_human_approval: policy.requires_human_approval,
        required_action: policy.required_action,
        required_roles: policy.required_roles || null,
        explanation: policy.explanation_template || ''
      });
    }
  }

  let result = 'ALLOW';
  let explanation = 'Nenhuma policy aplicável — acesso permitido.';

  if (triggered.length > 0) {
    const needsApproval = triggered.some(t => t.requires_human_approval);
    const hasCritical = triggered.some(t => t.severity === 'critical');
    const hasRbac = triggered.some(t => t.required_action === 'enforce_rbac');

    if (hasRbac) {
      const rbacPolicy = triggered.find(t => t.required_action === 'enforce_rbac');
      const allowedRoles = rbacPolicy?.required_roles || [];
      const userRole = String(input.user_role || '').toLowerCase();
      if (!allowedRoles.includes(userRole)) {
        result = 'DENY';
        explanation = `Perfil "${userRole}" não autorizado. Requer: ${allowedRoles.join(', ')}.`;
      } else if (needsApproval) {
        result = 'REQUIRE_APPROVAL';
        explanation = triggered.map(t => t.explanation).join(' ');
      }
    } else if (needsApproval || hasCritical) {
      result = 'REQUIRE_APPROVAL';
      explanation = triggered.map(t => t.explanation).join(' ');
    }
  }

  if (mode === 'off') {
    result = 'REQUIRE_APPROVAL';
    explanation = 'Policy engine desligado — fallback seguro exige aprovação humana.';
  }

  return {
    result,
    policies_triggered: triggered,
    explanation,
    engine_version: '1.0.0',
    deterministic: true,
    mode,
    domain,
    timestamp: new Date().toISOString()
  };
}

function getEngineHealth() {
  const mode = _mode();
  return {
    active: mode !== 'off',
    mode,
    engine_version: '1.0.0',
    safety_policies_count: _getPolicies('safety').length,
    environment_policies_count: _getPolicies('environment').length
  };
}

function reloadPolicies() {
  _safetyPolicies = null;
  _environmentPolicies = null;
}

module.exports = { evaluate, getEngineHealth, reloadPolicies };
