/**
 * OPM-GOV-001 — Operational Contract Baseline Registry.
 * Baseline oficial congelada — alterações requerem revisão arquitectural.
 */
import { OPM_GOV_001_LIFECYCLE, OPM_GOV_001_PHASE, getAllLifecycleModuleIds } from './opmGov001LifecycleContracts.js';
import {
  OPM_GOV_001_MOVEMENTS,
  OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE,
  getActiveMovementTypes,
  getReservedInternalMovementTypes
} from './opmGov001MovementContracts.js';
import { OPM_GOV_001_HANDOFFS } from './opmGov001HandoffContracts.js';
import {
  OPM_GOV_001_OBSERVABILITY,
  OPM_GOV_001_E2E_REQUIRED_EVENTS,
  getAllObservabilityEventIds
} from './opmGov001ObservabilityContracts.js';
import { OPM_GOV_001_INVARIANTS } from './opmGov001OperationalInvariants.js';
import { OPM_GOV_001_COMPATIBILITY } from './opmGov001CompatibilityMatrix.js';

export const OPM_GOV_001_REGISTRY = Object.freeze({
  id: 'OPM-GOV-001',
  label: 'Operational Contract Baseline',
  phase: OPM_GOV_001_PHASE,
  status: 'frozen',
  certifiedBy: 'OPM-E2E-001',
  effectiveDate: '2026-07-19',
  prerequisitePhases: Object.freeze([
    'BASELINE-SYSTEM',
    'ARC-001', 'ARC-002', 'ARC-003', 'ARC-003A',
    'NAV-001', 'NAV-002', 'NAV-002A',
    'OPM-001D', 'WMS-REF-001',
    'OPM-002A', 'OPM-003', 'OPM-004', 'OPM-005',
    'OPM-E2E-001'
  ]),
  nextPhase: 'OPM-006',
  governance: Object.freeze({
    lifecycle: OPM_GOV_001_LIFECYCLE,
    movements: OPM_GOV_001_MOVEMENTS,
    movementSequence: OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE,
    handoffs: OPM_GOV_001_HANDOFFS,
    observability: OPM_GOV_001_OBSERVABILITY,
    invariants: OPM_GOV_001_INVARIANTS,
    compatibility: OPM_GOV_001_COMPATIBILITY
  }),
  summary: Object.freeze({
    lifecycleModules: getAllLifecycleModuleIds().length,
    activeMovements: getActiveMovementTypes().length,
    reservedInternalMovements: getReservedInternalMovementTypes().length,
    handoffs: OPM_GOV_001_HANDOFFS.length,
    observabilityEvents: getAllObservabilityEventIds().length,
    invariants: OPM_GOV_001_INVARIANTS.length,
    compatibilityModules: OPM_GOV_001_COMPATIBILITY.modules.length,
    e2eRequiredEvents: OPM_GOV_001_E2E_REQUIRED_EVENTS.length
  })
});

export function isOpmGov001Frozen() {
  return OPM_GOV_001_REGISTRY.status === 'frozen';
}

export { OPM_GOV_001_PHASE };
