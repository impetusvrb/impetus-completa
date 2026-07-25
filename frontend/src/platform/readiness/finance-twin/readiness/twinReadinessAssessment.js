/**
 * FIN-TWIN-READY-001 — Overall Financial Twin readiness classification.
 * READY | PARTIAL | BLOCKED per dimension — no product implementation.
 */
import {
  TWIN_ENTITY_CATALOG,
  TWIN_ENTITY_STATUS,
  listTwinEntitiesByStatus,
  validateTwinEntityCatalog,
  FIN_TWIN_READY_001_PHASE,
  FIN_TWIN_READY_001_PRINCIPLE
} from '../entityCatalog/twinEntityCatalog.js';
import {
  TWIN_RELATIONSHIP_MAP,
  TWIN_CANONICAL_CHAIN,
  validateTwinRelationshipMap
} from '../relationshipMap/twinRelationshipMap.js';
import { TWIN_STATE_ATTRIBUTES, validateTwinStateModel } from '../stateModel/twinStateModel.js';
import { TWIN_EVENT_SOURCES, validateTwinEventSources } from '../eventSources/twinEventSources.js';

function countByStatus(rows, key = 'status') {
  const out = { READY: 0, PARTIAL: 0, BLOCKED: 0 };
  for (const r of rows) {
    const s = r[key] || r.availability;
    if (out[s] != null) out[s] += 1;
  }
  return out;
}

/**
 * Formal readiness verdict for opening FIN-EVOLVE-2.2 composition.
 */
export function assessFinancialTwinReadiness() {
  const entities = countByStatus(TWIN_ENTITY_CATALOG, 'availability');
  const relationships = countByStatus(TWIN_RELATIONSHIP_MAP, 'status');
  const stateAttrs = countByStatus(TWIN_STATE_ATTRIBUTES, 'status');
  const events = countByStatus(TWIN_EVENT_SOURCES, 'status');

  const blockedEntities = listTwinEntitiesByStatus(TWIN_ENTITY_STATUS.BLOCKED);
  const blockedRels = TWIN_RELATIONSHIP_MAP.filter((r) => r.status === TWIN_ENTITY_STATUS.BLOCKED);

  const existingRelations = TWIN_RELATIONSHIP_MAP.filter((r) => r.status === TWIN_ENTITY_STATUS.READY);
  const contractsAttending = Object.freeze([
    'finance.asset_cost_map.v1',
    'finance.driver_rate.v1',
    'finance.wms_valuation.v1',
    'dashboard.costs',
    'dashboard.financialLeakage',
    'FIN-EVOLVE-2.1 EconomicIntelligenceEngine'
  ]);
  const compositionOnly = TWIN_RELATIONSHIP_MAP.filter((r) => r.compositionOnly);
  const gapsRemaining = Object.freeze([
    Object.freeze({
      id: 'GAP-TWIN-001',
      title: 'Native $ attributes on operational twin nodes',
      status: TWIN_ENTITY_STATUS.PARTIAL,
      resolution: 'Compose overlay in FIN-EVOLVE-2.2 — do not mutate certified twin layout'
    }),
    Object.freeze({
      id: 'GAP-TWIN-002',
      title: 'Finance↔work_order certified join',
      status: TWIN_ENTITY_STATUS.PARTIAL,
      resolution: 'Optional for MVP; composition contract if orders needed on twin'
    }),
    Object.freeze({
      id: 'GAP-TWIN-003',
      title: 'Live energy/MES driver quantities',
      status: TWIN_ENTITY_STATUS.PARTIAL,
      resolution: 'Reuse plantRateProvider / drivers context from 2.1'
    }),
    Object.freeze({
      id: 'GAP-TWIN-004',
      title: 'Operational risk as first-class attribute',
      status: TWIN_ENTITY_STATUS.PARTIAL,
      resolution: 'Compose from leakage alerts + losses — no new risk engine'
    })
  ]);

  const noBlockers = blockedEntities.length === 0 && blockedRels.length === 0;
  const coreReady =
    entities.READY >= 10 &&
    relationships.READY >= 8 &&
    stateAttrs.READY >= 6 &&
    contractsAttending.length >= 5;

  /** Overall: PARTIAL with gate open for composition — not BLOCKED */
  const overall = noBlockers && coreReady ? TWIN_ENTITY_STATUS.READY : TWIN_ENTITY_STATUS.PARTIAL;

  return Object.freeze({
    phase: FIN_TWIN_READY_001_PHASE,
    principle: FIN_TWIN_READY_001_PRINCIPLE,
    overall,
    overallLabel:
      overall === TWIN_ENTITY_STATUS.READY
        ? 'READY for FIN-EVOLVE-2.2 composition (remaining PARTIAL items are composition overlays, not structural blockers)'
        : 'PARTIAL — resolve structural gaps before Twin product',
    counts: Object.freeze({
      entities,
      relationships,
      stateAttributes: stateAttrs,
      eventSources: events
    }),
    canonicalChain: TWIN_CANONICAL_CHAIN,
    existingRelations: existingRelations.map((r) => r.id),
    contractsAttending,
    compositionOnly: compositionOnly.map((r) => r.id),
    gapsRemaining,
    blockers: Object.freeze({
      entities: blockedEntities.map((e) => e.id),
      relationships: blockedRels.map((r) => r.id)
    }),
    gate: Object.freeze({
      openFinEvolve22Composition: overall === TWIN_ENTITY_STATUS.READY,
      openWhatIf: false,
      openPrediction: false,
      reason:
        overall === TWIN_ENTITY_STATUS.READY
          ? 'Entity graph + state model + update sources sufficient for Financial Twin composition in 2.2'
          : 'Structural readiness incomplete'
    }),
    forbidden: Object.freeze([
      'implement_digital_twin',
      'simulations',
      'what_if',
      'ai',
      'prediction',
      'new_calculations',
      'new_engines'
    ])
  });
}

export function validateTwinReadinessAssessment() {
  const issues = [];
  const assessment = assessFinancialTwinReadiness();
  if (!assessment.overall) issues.push('missing overall');
  if (assessment.blockers.entities.length > 0) {
    issues.push(`unexpected entity blockers: ${assessment.blockers.entities.join(',')}`);
  }
  if (assessment.blockers.relationships.length > 0) {
    issues.push(`unexpected relationship blockers: ${assessment.blockers.relationships.join(',')}`);
  }
  if (!assessment.gate.openFinEvolve22Composition) {
    issues.push('2.2 composition gate should open when no blockers');
  }
  if (assessment.gate.openWhatIf || assessment.gate.openPrediction) {
    issues.push('what-if/prediction must stay closed');
  }
  if (assessment.gapsRemaining.length < 3) issues.push('gaps list too short');
  return { valid: issues.length === 0, issues, assessment };
}

export { FIN_TWIN_READY_001_PHASE, FIN_TWIN_READY_001_PRINCIPLE, TWIN_ENTITY_STATUS };
