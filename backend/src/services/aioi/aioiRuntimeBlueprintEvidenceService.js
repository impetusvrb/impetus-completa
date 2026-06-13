'use strict';

/**
 * AIOI-P16.3 — Runtime Blueprint Evidence Service
 *
 * Rastreabilidade de blueprints — READ ONLY.
 * Spec: backend/docs/AIOI_RUNTIME_BLUEPRINT_EVIDENCE_SPECIFICATION.md
 */

const cognitiveRuntimeBlueprint = require('./aioiCognitiveRuntimeBlueprintService');
const runtimeValidationCatalog = require('./aioiRuntimeValidationCatalogService');
const simulationCatalog = require('./aioiSimulationCatalogService');
const authorizationCatalog = require('./aioiAuthorizationCatalogService');

const LAYER = 'AIOI_RUNTIME_BLUEPRINT_EVIDENCE';

const PHASE_REPORTS = [
  'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md',
  'AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md',
  'AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_REPORT.md'
];

function _firstIds(catalog, field, n) {
  return Object.values(catalog.catalog || {}).flat()
    .map(item => item[field])
    .filter(Boolean)
    .slice(0, n);
}

/**
 * Cadeias de evidência para o blueprint — usa catálogos diretos para evitar
 * re-execução das chains pesadas de P13/P14/P15.
 * @returns {Promise<object>}
 */
async function getRuntimeBlueprintEvidenceChains() {
  const [blueprint, rtvCatalog, simCat, authCat] = await Promise.all([
    cognitiveRuntimeBlueprint.generateRuntimeBlueprint(),
    runtimeValidationCatalog.getRuntimeValidationCatalog(),
    simulationCatalog.getSimulationCatalog(),
    authorizationCatalog.getAuthorizationCatalog()
  ]);

  const sourceValidations = _firstIds(rtvCatalog, 'validation_id', 5);
  const sourceSimulations  = _firstIds(simCat, 'simulation_id', 5);
  const sourceModels       = _firstIds(authCat, 'authorization_model_id', 5);

  const evidenceChain = [
    ...sourceValidations.map(id => ({
      link_type: 'runtime_validation_ref',
      source:    'aioiCognitiveRuntimeValidationService',
      field:     id
    })),
    ...sourceSimulations.map(id => ({
      link_type: 'simulation_ref',
      source:    'aioiCognitiveSimulationService',
      field:     id
    })),
    ...sourceModels.map(id => ({
      link_type: 'auth_model_ref',
      source:    'aioiCognitiveAuthorizationModelingService',
      field:     id
    })),
    ...PHASE_REPORTS.map(doc => ({
      link_type: 'phase_certification',
      source:    doc,
      field:     'certification_pass'
    }))
  ];

  const validationsOk   = sourceValidations.length > 0;
  const simulationsOk   = sourceSimulations.length > 0;
  const modelsOk        = sourceModels.length > 0;
  const traceabilityStatus = evidenceChain.length > 0 && validationsOk && simulationsOk && modelsOk
    ? 'TRACEABLE'
    : 'MISSING_EVIDENCE';

  const chain = {
    blueprint_id:       blueprint.blueprint_id,
    evidence_chain:     evidenceChain,
    source_validations: sourceValidations,
    source_simulations: sourceSimulations,
    source_models:      sourceModels,
    traceability_status: traceabilityStatus,
    evidence_count:     evidenceChain.length
  };

  return {
    ok: traceabilityStatus === 'TRACEABLE',
    layer: LAYER,
    chains: [chain],
    total_blueprints: 1,
    traceable_count:  traceabilityStatus === 'TRACEABLE' ? 1 : 0,
    all_have_evidence: traceabilityStatus === 'TRACEABLE',
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getRuntimeBlueprintEvidenceChains,
  LAYER
};
