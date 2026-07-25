/**
 * FIN-TWIN-READY-001 — Read-only planning API.
 */
import {
  FIN_TWIN_READY_001_PHASE,
  FIN_TWIN_READY_001_PRINCIPLE,
  TWIN_ENTITY_CATALOG,
  TWIN_ENTITY_STATUS,
  getTwinEntity,
  listTwinEntitiesByStatus,
  validateTwinEntityCatalog
} from '../entityCatalog/twinEntityCatalog.js';
import {
  TWIN_RELATIONSHIP_MAP,
  TWIN_CANONICAL_CHAIN,
  listRelationshipsFrom,
  listRelationshipsTo,
  validateTwinRelationshipMap
} from '../relationshipMap/twinRelationshipMap.js';
import {
  TWIN_STATE_MODEL,
  TWIN_STATE_ATTRIBUTES,
  validateTwinStateModel
} from '../stateModel/twinStateModel.js';
import {
  TWIN_EVENT_SOURCES,
  listEventsAffecting,
  validateTwinEventSources
} from '../eventSources/twinEventSources.js';
import {
  assessFinancialTwinReadiness,
  validateTwinReadinessAssessment
} from '../readiness/twinReadinessAssessment.js';

export function getFinanceTwinReadyAudit() {
  const assessment = assessFinancialTwinReadiness();
  return Object.freeze({
    phase: FIN_TWIN_READY_001_PHASE,
    principle: FIN_TWIN_READY_001_PRINCIPLE,
    scope: Object.freeze({
      implementsTwin: false,
      implementsSimulations: false,
      implementsWhatIf: false,
      implementsAi: false,
      newCalculations: false,
      newEngines: false,
      readOnly: true
    }),
    entities: TWIN_ENTITY_CATALOG,
    relationships: TWIN_RELATIONSHIP_MAP,
    canonicalChain: TWIN_CANONICAL_CHAIN,
    stateModel: TWIN_STATE_MODEL,
    eventSources: TWIN_EVENT_SOURCES,
    assessment,
    recommendations: Object.freeze([
      'Open FIN-EVOLVE-2.2 focused on composing Financial Twin state from existing engines',
      'Overlay $ on operational twin nodes — do not mutate certified digital_twin layout',
      'Reuse EconomicIntelligenceEngine for cost_by_asset/line/cc and performance attrs',
      'Keep What-if / Prediction for 2.3 / 2.4',
      'Treat billing/wallet/ledger as peripheral plane, not plant P&L core'
    ])
  });
}

export function validateFinTwinReady001() {
  const parts = [
    validateTwinEntityCatalog(),
    validateTwinRelationshipMap(),
    validateTwinStateModel(),
    validateTwinEventSources(),
    validateTwinReadinessAssessment()
  ];
  const issues = parts.flatMap((p) => p.issues || []);
  return {
    valid: parts.every((p) => p.valid) && issues.length === 0,
    issues,
    parts,
    audit: getFinanceTwinReadyAudit()
  };
}

export {
  FIN_TWIN_READY_001_PHASE,
  FIN_TWIN_READY_001_PRINCIPLE,
  TWIN_ENTITY_STATUS,
  TWIN_ENTITY_CATALOG,
  getTwinEntity,
  listTwinEntitiesByStatus,
  TWIN_RELATIONSHIP_MAP,
  TWIN_CANONICAL_CHAIN,
  listRelationshipsFrom,
  listRelationshipsTo,
  TWIN_STATE_MODEL,
  TWIN_STATE_ATTRIBUTES,
  TWIN_EVENT_SOURCES,
  listEventsAffecting,
  assessFinancialTwinReadiness
};
