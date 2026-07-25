/**
 * OPM-GOV-001 — Official import path.
 */
export {
  OPM_GOV_001_REGISTRY,
  OPM_GOV_001_PHASE,
  isOpmGov001Frozen
} from './opmGov001Registry.js';

export {
  OPM_GOV_001_LIFECYCLE,
  getLifecycleForModule,
  getAllLifecycleModuleIds
} from './opmGov001LifecycleContracts.js';

export {
  OPM_GOV_001_MOVEMENTS,
  OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE,
  getActiveMovementTypes,
  getInternalMovementTypes,
  getReservedInternalMovementTypes,
  isMovementTypeCertified
} from './opmGov001MovementContracts.js';

export {
  OPM_GOV_001_HANDOFFS,
  getHandoffById,
  getHandoffsForModule
} from './opmGov001HandoffContracts.js';

export {
  OPM_GOV_001_OBSERVABILITY,
  OPM_GOV_001_E2E_REQUIRED_EVENTS,
  getObservabilityForModule,
  getAllObservabilityEventIds,
  getRequiredOperationalEvents
} from './opmGov001ObservabilityContracts.js';

export {
  OPM_GOV_001_INVARIANTS,
  getInvariantsForModule,
  getInvariantById
} from './opmGov001OperationalInvariants.js';

export {
  OPM_GOV_001_COMPATIBILITY,
  getCompatibilityForModule,
  getCertifiedModuleIds
} from './opmGov001CompatibilityMatrix.js';
