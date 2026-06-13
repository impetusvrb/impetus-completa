'use strict';

/**
 * AIOI-P15.5 — Runtime Safety Service
 *
 * Regras de segurança para validação de runtime — READ ONLY.
 * Spec: backend/docs/AIOI_RUNTIME_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveRuntimeValidation = require('./aioiCognitiveRuntimeValidationService');
const runtimeBoundary = require('./aioiRuntimeBoundaryService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_RUNTIME_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

/**
 * Valida regras RTS-01..RTS-08.
 * @returns {Promise<object>}
 */
async function validateRuntimeSafety() {
  const [validationResult, boundaries, authState] = await Promise.all([
    cognitiveRuntimeValidation.generateRuntimeValidation(),
    runtimeBoundary.validateRuntimeBoundaries(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"runtime_active"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta)
      && !/"cognitive_execution_allowed"\s*:\s*true/.test(meta);
  }

  const invariants = validationResult.invariants;

  const checks = [
    { id: 'RTS-01', name: 'sem_runtime_ativo', pass: !invariants.runtime_active && runtimeMetaOk },
    { id: 'RTS-02', name: 'sem_execucao', pass: validationResult.validations.every(v => v.is_execution === false) },
    { id: 'RTS-03', name: 'sem_autorizacao', pass: !authState.authorized && validationResult.all_runtime_denied },
    { id: 'RTS-04', name: 'sem_alteracao_estado', pass: validationResult.validations.every(v => v.runtime_constraints.state_mutation_allowed === false) },
    { id: 'RTS-05', name: 'sem_alteracao_workflow', pass: boundaries.checks.find(c => c.id === 'RBV-05')?.pass !== false },
    { id: 'RTS-06', name: 'sem_alteracao_compliance', pass: boundaries.checks.find(c => c.id === 'RBV-06')?.pass !== false },
    { id: 'RTS-07', name: 'sem_alteracao_soberanos', pass: boundaries.checks.find(c => c.id === 'RBV-07')?.pass !== false },
    { id: 'RTS-08', name: 'sem_cognicao_operacional', pass: !invariants.cognitive_execution_allowed && authState.level === 'NONE' }
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
  validateRuntimeSafety,
  LAYER
};
