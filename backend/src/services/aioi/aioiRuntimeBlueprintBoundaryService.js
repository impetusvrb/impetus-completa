'use strict';

/**
 * AIOI-P16.4 — Runtime Blueprint Boundary Service
 *
 * Limites de blueprint de runtime — validação only.
 * Spec: backend/docs/AIOI_RUNTIME_BLUEPRINT_BOUNDARY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveRuntimeBlueprint = require('./aioiCognitiveRuntimeBlueprintService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_RUNTIME_BLUEPRINT_BOUNDARY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

/**
 * Valida limites RBB-01..RBB-08.
 * @returns {Promise<object>}
 */
async function validateRuntimeBlueprintBoundaries() {
  const [blueprint, authState] = await Promise.all([
    cognitiveRuntimeBlueprint.generateRuntimeBlueprint(),
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

  const c = blueprint.runtime_constraints;
  const allGatesClosed      = blueprint.all_gates_closed;
  const notDeployable       = blueprint.deployable === false
    && blueprint.blueprint_status === 'DEFINED_NOT_DEPLOYABLE';
  const allControlsUnsat    = blueprint.all_controls_unsatisfied;

  const checks = [
    { id: 'RBB-01', name: 'blueprint_nao_runtime',       pass: notDeployable && allGatesClosed },
    { id: 'RBB-02', name: 'blueprint_nao_execucao',      pass: !c.auto_execution_allowed },
    { id: 'RBB-03', name: 'blueprint_nao_autorizacao',   pass: !c.runtime_authorized && !authState.authorized && allControlsUnsat },
    { id: 'RBB-04', name: 'blueprint_nao_decisao',       pass: blueprint.runtime_components.every(comp => comp.requires_human === true) },
    { id: 'RBB-05', name: 'blueprint_nao_altera_workflow',    pass: !c.workflow_mutation_allowed },
    { id: 'RBB-06', name: 'blueprint_nao_altera_compliance',  pass: !c.compliance_mutation_allowed },
    { id: 'RBB-07', name: 'blueprint_nao_altera_soberanos',   pass: !c.sovereign_mutation_allowed },
    { id: 'RBB-08', name: 'blueprint_nao_ativacao_cognitiva', pass: runtimeMetaOk && authState.level === 'NONE' }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass   = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    boundaries_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRuntimeBlueprintBoundaries,
  LAYER
};
