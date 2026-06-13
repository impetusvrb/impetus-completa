'use strict';

/**
 * AIOI-P16.1 — Cognitive Runtime Blueprint Service
 *
 * Blueprint formal de futuro runtime cognitivo governado — sem runtime real.
 * Spec: backend/docs/AIOI_COGNITIVE_RUNTIME_BLUEPRINT_SPECIFICATION.md
 */

const crypto = require('crypto');
const cognitiveRuntimeValidation = require('./aioiCognitiveRuntimeValidationService');
const runtimeValidationCatalog = require('./aioiRuntimeValidationCatalogService');
const simulationCatalog = require('./aioiSimulationCatalogService');
const authorizationCatalog = require('./aioiAuthorizationCatalogService');
const cognitiveAuthorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_COGNITIVE_RUNTIME_BLUEPRINT';

const BLUEPRINT_CATEGORIES = [
  'governance', 'compliance', 'assurance', 'knowledge', 'observation',
  'recommendation', 'human_review', 'authorization', 'simulation', 'runtime'
];

const BLUEPRINT_STATUS = 'DEFINED_NOT_DEPLOYABLE';

function _blueprintId() {
  const hash = crypto.createHash('sha256')
    .update(`BLUEPRINT:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `BLUEPRINT-${hash}`;
}

function _runtimeComponents() {
  return BLUEPRINT_CATEGORIES.map(cat => ({
    component_id:     `COMP-${cat.toUpperCase().replace('_', '-')}`,
    category:         cat,
    status:           'NOT_DEPLOYABLE',
    requires_human:   true,
    requires_approval: true
  }));
}

function _runtimeControls() {
  return [
    { control_id: 'CTRL-SOVEREIGN-APPROVAL',  required: true, satisfied: false },
    { control_id: 'CTRL-GOVERNANCE-ASSURANCE', required: true, satisfied: false },
    { control_id: 'CTRL-COMPLIANCE-VERIFIED', required: true, satisfied: false },
    { control_id: 'CTRL-BOUNDARY-CHECKED',    required: true, satisfied: false },
    { control_id: 'CTRL-SAFETY-VALIDATED',    required: true, satisfied: false },
    { control_id: 'CTRL-SIMULATION-PASSED',   required: true, satisfied: false },
    { control_id: 'CTRL-P15-VALIDATED',       required: true, satisfied: false }
  ];
}

function _runtimeGates() {
  return [
    { gate_id: 'GATE-1-GOVERNANCE',    description: 'Aprovação formal de governança', open: false },
    { gate_id: 'GATE-2-COMPLIANCE',    description: 'Conformidade plena verificada', open: false },
    { gate_id: 'GATE-3-HUMAN-REVIEW',  description: 'Revisão humana completa', open: false },
    { gate_id: 'GATE-4-SIMULATION',    description: 'Simulações aprovadas', open: false },
    { gate_id: 'GATE-5-AUTHORIZATION', description: 'Autorização explícita concedida', open: false },
    { gate_id: 'GATE-6-DEPLOYMENT',    description: 'Deploy aprovado por soberano', open: false }
  ];
}

function _runtimeConstraints() {
  return {
    runtime_enabled:             false,
    runtime_active:              false,
    runtime_authorized:          false,
    cognitive_execution_allowed: false,
    state_mutation_allowed:      false,
    workflow_mutation_allowed:   false,
    compliance_mutation_allowed: false,
    sovereign_mutation_allowed:  false,
    auto_execution_allowed:      false
  };
}

/**
 * Gera blueprint formal de runtime cognitivo — READ ONLY.
 * @returns {Promise<object>}
 */
async function generateRuntimeBlueprint() {
  const [validation, validationCatalog, simCatalog, authCatalog, authState] = await Promise.all([
    cognitiveRuntimeValidation.generateRuntimeValidation(),
    runtimeValidationCatalog.getRuntimeValidationCatalog(),
    simulationCatalog.getSimulationCatalog(),
    authorizationCatalog.getAuthorizationCatalog(),
    Promise.resolve(cognitiveAuthorization.getAuthorizationState())
  ]);

  const components = _runtimeComponents();
  const controls = _runtimeControls();
  const gates = _runtimeGates();
  const constraints = _runtimeConstraints();

  return {
    ok: true,
    layer: LAYER,
    blueprint_id:          _blueprintId(),
    runtime_components:    components,
    runtime_dependencies: {
      p15_validation_count: validation.validation_count,
      p14_simulation_count: simCatalog.total_simulations,
      p13_auth_model_count: authCatalog.total_models,
      catalog_validated:    validationCatalog.all_runtime_denied
    },
    runtime_controls:      controls,
    runtime_gates:         gates,
    runtime_constraints:   constraints,
    blueprint_status:      BLUEPRINT_STATUS,
    all_gates_closed:      gates.every(g => g.open === false),
    all_controls_unsatisfied: controls.every(c => c.satisfied === false),
    deployable:            false,
    invariants:            authState.invariants,
    generated_at:          new Date().toISOString()
  };
}

module.exports = {
  generateRuntimeBlueprint,
  BLUEPRINT_STATUS,
  BLUEPRINT_CATEGORIES,
  LAYER
};
