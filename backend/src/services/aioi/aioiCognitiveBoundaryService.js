'use strict';

/**
 * AIOI-P9.2 — Cognitive Boundary Service
 *
 * Limites operacionais formais — validação only, zero execução.
 * Spec: backend/docs/AIOI_COGNITIVE_BOUNDARY_SPECIFICATION.md
 */

const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');

const LAYER = 'AIOI_COGNITIVE_BOUNDARY';

const BOUNDARY_CATEGORIES = [
  'OBSERVE_ONLY',
  'RECOMMEND_ONLY',
  'HITL_REQUIRED',
  'EXECUTION_FORBIDDEN'
];

const BOUNDARY_CATALOG = [
  { domain: 'operational_metrics',  category: 'OBSERVE_ONLY',        actions: ['read', 'aggregate'] },
  { domain: 'knowledge_catalog',    category: 'OBSERVE_ONLY',        actions: ['read', 'catalog'] },
  { domain: 'decision_history',     category: 'OBSERVE_ONLY',        actions: ['read', 'analyze'] },
  { domain: 'compliance_analytics', category: 'OBSERVE_ONLY',        actions: ['read', 'report'] },
  { domain: 'executive_recommendation', category: 'RECOMMEND_ONLY', actions: ['suggest', 'summarize'] },
  { domain: 'direct_action',        category: 'HITL_REQUIRED',       actions: ['propose', 'approve'] },
  { domain: 'workflow',             category: 'HITL_REQUIRED',       actions: ['start', 'transition'] },
  { domain: 'priority',             category: 'EXECUTION_FORBIDDEN', actions: ['recalculate', 'override'] },
  { domain: 'truth',                category: 'EXECUTION_FORBIDDEN', actions: ['validate_local', 'override'] },
  { domain: 'learning',             category: 'EXECUTION_FORBIDDEN', actions: ['mutate_learning_store', 'unsanctioned_learn'] },
  { domain: 'queue',                category: 'EXECUTION_FORBIDDEN', actions: ['bypass_sovereign', 'dual_queue'] },
  { domain: 'execution',            category: 'HITL_REQUIRED',       actions: ['execute', 'auto_execute'] },
  { domain: 'cognitive_runtime',    category: 'EXECUTION_FORBIDDEN', actions: ['activate', 'enable'] },
  { domain: 'ORG-1',                category: 'EXECUTION_FORBIDDEN', actions: ['mutate', 'bypass'] },
  { domain: 'ORG-2',                category: 'EXECUTION_FORBIDDEN', actions: ['mutate', 'bypass'] },
  { domain: 'ORG-3',                category: 'EXECUTION_FORBIDDEN', actions: ['mutate', 'bypass'] },
  { domain: 'ORG-4',                category: 'EXECUTION_FORBIDDEN', actions: ['mutate', 'bypass'] },
  { domain: 'ORG-5',                category: 'EXECUTION_FORBIDDEN', actions: ['mutate', 'bypass'] }
];

/**
 * Catálogo de limites cognitivos formais.
 * @returns {object}
 */
function getBoundaryCatalog() {
  return {
    ok: true,
    layer: LAYER,
    categories: BOUNDARY_CATEGORIES,
    boundaries: BOUNDARY_CATALOG,
    total_boundaries: BOUNDARY_CATALOG.length,
    execution_allowed: false,
    captured_at: new Date().toISOString()
  };
}

/**
 * Valida se uma ação está dentro dos limites — validação only.
 * @param {string} domain
 * @param {string} action
 * @returns {object}
 */
function validateBoundary(domain, action) {
  const registry = authorityRegistry.getCognitiveAuthorityRegistry();
  const entry = BOUNDARY_CATALOG.find(b => b.domain === domain);
  const forbidden = registry.forbidden_domains.find(f => f.id === domain);

  if (forbidden) {
    return {
      ok: false,
      domain,
      action,
      allowed: false,
      category: 'EXECUTION_FORBIDDEN',
      reason: forbidden.reason,
      validation_only: true
    };
  }

  if (!entry) {
    return {
      ok: false,
      domain,
      action,
      allowed: false,
      category: 'EXECUTION_FORBIDDEN',
      reason: 'DOMAIN_NOT_IN_CATALOG',
      validation_only: true
    };
  }

  const actionAllowed = entry.actions.includes(action);
  const categoryBlocks = entry.category === 'EXECUTION_FORBIDDEN'
    || (entry.category === 'OBSERVE_ONLY' && !['read', 'aggregate', 'catalog', 'analyze', 'report'].includes(action))
    || (entry.category === 'RECOMMEND_ONLY' && !['suggest', 'summarize', 'read'].includes(action));

  const allowed = actionAllowed && !categoryBlocks && entry.category !== 'EXECUTION_FORBIDDEN';

  return {
    ok: true,
    domain,
    action,
    allowed: false,
    category: entry.category,
    reason: allowed ? 'BOUNDARY_WOULD_ALLOW_BUT_RUNTIME_DISABLED' : 'BOUNDARY_RESTRICTED',
    validation_only: true,
    execution_performed: false
  };
}

module.exports = {
  getBoundaryCatalog,
  validateBoundary,
  BOUNDARY_CATEGORIES,
  LAYER
};
