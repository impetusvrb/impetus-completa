'use strict';

/**
 * AIOI-P16.5 — Runtime Blueprint Safety Service
 *
 * Regras de segurança para blueprint de runtime — READ ONLY.
 * Spec: backend/docs/AIOI_RUNTIME_BLUEPRINT_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveRuntimeBlueprint = require('./aioiCognitiveRuntimeBlueprintService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_RUNTIME_BLUEPRINT_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

/**
 * Valida regras RBS-01..RBS-08.
 * @returns {Promise<object>}
 */
async function validateRuntimeBlueprintSafety() {
  const [blueprint, authState] = await Promise.all([
    cognitiveRuntimeBlueprint.generateRuntimeBlueprint(),
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

  const inv = blueprint.invariants;
  const c   = blueprint.runtime_constraints;

  const checks = [
    { id: 'RBS-01', name: 'sem_runtime_ativo',        pass: !inv.runtime_active && runtimeMetaOk },
    { id: 'RBS-02', name: 'sem_execucao',             pass: !c.auto_execution_allowed },
    { id: 'RBS-03', name: 'sem_autorizacao',          pass: !authState.authorized && blueprint.deployable === false },
    { id: 'RBS-04', name: 'sem_alteracao_estado',     pass: !c.state_mutation_allowed },
    { id: 'RBS-05', name: 'sem_alteracao_workflow',   pass: !c.workflow_mutation_allowed },
    { id: 'RBS-06', name: 'sem_alteracao_compliance', pass: !c.compliance_mutation_allowed },
    { id: 'RBS-07', name: 'sem_alteracao_soberanos',  pass: !c.sovereign_mutation_allowed },
    { id: 'RBS-08', name: 'sem_cognicao_operacional', pass: !inv.cognitive_execution_allowed && authState.level === 'NONE' }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass   = passCount === checks.length;

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
  validateRuntimeBlueprintSafety,
  LAYER
};
