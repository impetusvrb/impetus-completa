'use strict';

/**
 * SEC-10 — Adaptive Surface Protection.
 * Apenas recommended_actions — NUNCA bloqueia ou altera runtime.
 */

const SURFACE_ACTIONS = Object.freeze([
  'reduce_attack_surface',
  'hide_sensitive_endpoints',
  'enable_rate_limiting',
  'enable_captcha',
  'limit_admin_access',
  'isolate_uploads',
  'restrict_admin_apis',
  'disable_public_documentation'
]);

function buildRecommendedActions(threatLevel, patterns, integrityStatus) {
  const actions = [];
  const patternSet = new Set((patterns || []).map((p) => p.pattern || p));

  if (threatLevel === 'LOW' || threatLevel === 'MEDIUM') {
    actions.push({
      action: 'enable_rate_limiting',
      priority: 'MEDIUM',
      rationale: 'Desacelerar scanners sem bloquear tráfego legítimo',
      auto_execute: false
    });
  }

  if (patternSet.has('Credential Scan') || patternSet.has('API Enumeration')) {
    actions.push({
      action: 'restrict_admin_apis',
      priority: 'HIGH',
      rationale: 'Reduzir exposição de APIs administrativas durante enumeração',
      auto_execute: false
    });
    actions.push({
      action: 'limit_admin_access',
      priority: 'HIGH',
      rationale: 'Restringir acesso admin durante credential scan',
      auto_execute: false
    });
  }

  if (patternSet.has('Directory Bruteforce') || patternSet.has('Massive Enumeration')) {
    actions.push({
      action: 'hide_sensitive_endpoints',
      priority: 'HIGH',
      rationale: 'Ocultar endpoints sensíveis da superfície pública',
      auto_execute: false
    });
    actions.push({
      action: 'reduce_attack_surface',
      priority: 'MEDIUM',
      rationale: 'Reduzir superfície de ataque exposta',
      auto_execute: false
    });
  }

  if (patternSet.has('Distributed Scanner') || patternSet.has('Bot Scan')) {
    actions.push({
      action: 'enable_captcha',
      priority: 'MEDIUM',
      rationale: 'Mitigar bots e scanners automatizados',
      auto_execute: false
    });
    actions.push({
      action: 'enable_rate_limiting',
      priority: 'HIGH',
      rationale: 'Desacelerar scan distribuído',
      auto_execute: false
    });
  }

  if (patternSet.has('Cloud Scanner')) {
    actions.push({
      action: 'disable_public_documentation',
      priority: 'MEDIUM',
      rationale: 'Ocultar documentação pública durante cloud scan',
      auto_execute: false
    });
  }

  if (integrityStatus === 'COMPROMISED' || integrityStatus === 'DEGRADED') {
    actions.push({
      action: 'isolate_uploads',
      priority: 'CRITICAL',
      rationale: 'Isolar uploads durante degradação de integridade',
      auto_execute: false
    });
  }

  if (threatLevel === 'CRITICAL') {
    actions.push({
      action: 'reduce_attack_surface',
      priority: 'CRITICAL',
      rationale: 'Redução máxima de superfície — recomendação consultiva',
      auto_execute: false
    });
  }

  const seen = new Set();
  return actions.filter((a) => {
    if (seen.has(a.action)) return false;
    seen.add(a.action);
    return SURFACE_ACTIONS.includes(a.action);
  });
}

module.exports = { SURFACE_ACTIONS, buildRecommendedActions };
