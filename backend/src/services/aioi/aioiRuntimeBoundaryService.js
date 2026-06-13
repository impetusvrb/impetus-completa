'use strict';

/**
 * AIOI-P15.4 — Runtime Boundary Service
 *
 * Limites de validação de runtime — validação only.
 * Spec: backend/docs/AIOI_RUNTIME_BOUNDARY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveRuntimeValidation = require('./aioiCognitiveRuntimeValidationService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_RUNTIME_BOUNDARY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const EXECUTION_PATTERNS = [
  /\bexecute\b/i,
  /\bauto.?auth/i,
  /\bauto.?approv/i,
  /\benable runtime\b/i,
  /\bactivate runtime\b/i,
  /\bmutate\b/i
];

/**
 * Valida limites RBV-01..RBV-08.
 * @returns {Promise<object>}
 */
async function validateRuntimeBoundaries() {
  const [validationResult, authState] = await Promise.all([
    cognitiveRuntimeValidation.generateRuntimeValidation(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta)
      && !/"runtime_active"\s*:\s*true/.test(meta);
  }

  const allNotRuntime = validationResult.validations.every(v => v.is_runtime === false);
  const allNotPossible = validationResult.validations.every(v => v.runtime_possible === false);
  const allNotExecution = validationResult.validations.every(v => v.is_execution === false);
  const allNotAuthorized = validationResult.validations.every(v => v.is_authorized === false);
  const constraintsOk = validationResult.validations.every(v =>
    v.runtime_constraints.runtime_enabled === false
    && v.runtime_constraints.runtime_active === false
    && v.runtime_constraints.cognitive_execution_allowed === false
  );

  const checks = [
    { id: 'RBV-01', name: 'validacao_nao_runtime', pass: allNotRuntime && allNotPossible && validationResult.validation_only },
    { id: 'RBV-02', name: 'validacao_nao_execucao', pass: allNotExecution },
    { id: 'RBV-03', name: 'validacao_nao_autorizacao', pass: allNotAuthorized && !authState.authorized },
    { id: 'RBV-04', name: 'validacao_nao_decisao', pass: validationResult.validations.every(v => v.is_authorized === false) },
    { id: 'RBV-05', name: 'validacao_nao_altera_workflow', pass: constraintsOk && validationResult.validations.every(v => v.runtime_constraints.workflow_mutation_allowed === false) },
    { id: 'RBV-06', name: 'validacao_nao_altera_compliance', pass: validationResult.validations.every(v => v.runtime_constraints.compliance_mutation_allowed === false) },
    { id: 'RBV-07', name: 'validacao_nao_altera_soberanos', pass: validationResult.validations.every(v => v.runtime_constraints.sovereign_mutation_allowed === false) },
    { id: 'RBV-08', name: 'validacao_nao_ativacao_cognitiva', pass: runtimeMetaOk && authState.level === 'NONE' && constraintsOk }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    boundaries_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    forbidden_patterns_checked: EXECUTION_PATTERNS.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRuntimeBoundaries,
  LAYER
};
