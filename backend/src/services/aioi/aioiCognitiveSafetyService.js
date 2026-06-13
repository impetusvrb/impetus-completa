'use strict';

/**
 * AIOI-P9.5 — Cognitive Safety Service
 *
 * Validação de invariantes de segurança cognitiva — READ ONLY.
 * Spec: backend/docs/AIOI_COGNITIVE_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const authorityRegistry = require('./aioiCognitiveAuthorityRegistryService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_COGNITIVE_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

/**
 * Valida regras CS-01..CS-08.
 * @returns {object}
 */
function validateSafetyInvariants() {
  const registry = authorityRegistry.getCognitiveAuthorityRegistry();
  const authState = authorization.getAuthorizationState();

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta)
      && !/"runtime_authorized"\s*:\s*true/.test(meta);
  }

  const checks = [
    {
      id: 'CS-01',
      name: 'sem_auto_expansao',
      pass: registry.forbidden_domains.some(d => d.id === 'auto_expansion'),
      detail: { forbidden_count: registry.forbidden_domains.length }
    },
    {
      id: 'CS-02',
      name: 'sem_auto_modificacao',
      pass: registry.forbidden_domains.some(d => d.id === 'auto_modification'),
      detail: {}
    },
    {
      id: 'CS-03',
      name: 'sem_alteracao_soberanos',
      pass: registry.org_sovereigns_protected
        && registry.protected_domains.length >= 5,
      detail: { org_count: registry.protected_domains.length }
    },
    {
      id: 'CS-04',
      name: 'sem_alteracao_workflow',
      pass: registry.forbidden_domains.some(d => d.id === 'workflow_mutation'),
      detail: {}
    },
    {
      id: 'CS-05',
      name: 'sem_alteracao_compliance',
      pass: registry.forbidden_domains.some(d => d.id === 'compliance_mutation'),
      detail: {}
    },
    {
      id: 'CS-06',
      name: 'sem_alteracao_sla',
      pass: !authState.authorized,
      detail: { sla_mutation_blocked: true }
    },
    {
      id: 'CS-07',
      name: 'sem_alteracao_governanca',
      pass: registry.forbidden_domains.some(d => d.id === 'governance_mutation'),
      detail: {}
    },
    {
      id: 'CS-08',
      name: 'sem_execucao_cognitiva',
      pass: !authState.authorized
        && authState.level === 'NONE'
        && runtimeMetaOk
        && !authState.invariants.cognitive_execution_allowed,
      detail: { runtime_meta_ok: runtimeMetaOk }
    }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    safety_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateSafetyInvariants,
  LAYER
};
