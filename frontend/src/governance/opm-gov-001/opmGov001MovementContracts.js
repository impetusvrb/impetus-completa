/**
 * OPM-GOV-001 — Stock Movement Baseline (congelado).
 * Business · Fulfillment · Internal (reservados OPM-006).
 */
export const OPM_GOV_001_MOVEMENTS = Object.freeze({
  business: Object.freeze({
    category: 'business',
    description: 'Mudança de posse operacional do estoque',
    types: Object.freeze([
      Object.freeze({
        id: 'receipt',
        label: 'Receipt',
        direction: 'inbound',
        referenceTypes: ['receiving'],
        sourcePhase: 'OPM-003',
        status: 'active',
        apiSurface: 'POST /v1/inventory/movements'
      }),
      Object.freeze({
        id: 'issue',
        label: 'Issue',
        direction: 'outbound',
        referenceTypes: ['shipping'],
        sourcePhase: 'OPM-005',
        status: 'active',
        apiSurface: 'POST /v1/inventory/movements'
      })
    ])
  }),
  fulfillment: Object.freeze({
    category: 'fulfillment',
    description: 'Reserva e preparação para expedição',
    types: Object.freeze([
      Object.freeze({
        id: 'pick',
        label: 'Pick',
        direction: 'internal_outbound',
        referenceTypes: ['picking'],
        sourcePhase: 'OPM-004',
        status: 'active',
        apiSurface: 'POST /v1/inventory/movements',
        metadataFlags: ['reserved']
      })
    ])
  }),
  internal: Object.freeze({
    category: 'internal',
    description: 'Movimentações internas — activadas OPM-006 (camada transversal)',
    activationPhase: 'OPM-006',
    status: 'active',
    activatedBy: 'OPM-006',
    types: Object.freeze([
      Object.freeze({
        id: 'transfer',
        label: 'Transfer',
        targetPhase: 'OPM-006',
        status: 'active',
        apiSurface: 'POST /v1/inventory/movements',
        movementType: 'transfer'
      }),
      Object.freeze({
        id: 'relocation',
        label: 'Relocation',
        targetPhase: 'OPM-006',
        status: 'active',
        metadataKey: 'internal_movement_type'
      }),
      Object.freeze({
        id: 'replenishment',
        label: 'Replenishment',
        targetPhase: 'OPM-006',
        status: 'active',
        metadataKey: 'internal_movement_type'
      }),
      Object.freeze({
        id: 'crossDock',
        label: 'Cross Dock',
        targetPhase: 'OPM-006',
        status: 'active',
        metadataKey: 'internal_movement_type'
      })
    ])
  })
});

/** Sequência certificada E2E-001 */
export const OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE = Object.freeze(['receipt', 'pick', 'issue']);

export function getActiveMovementTypes() {
  return [
    ...OPM_GOV_001_MOVEMENTS.business.types.map((t) => t.id),
    ...OPM_GOV_001_MOVEMENTS.fulfillment.types.map((t) => t.id)
  ];
}

export function getInternalMovementTypes() {
  return OPM_GOV_001_MOVEMENTS.internal.types.map((t) => t.id);
}

/** @deprecated use getInternalMovementTypes — activados OPM-006 */
export function getReservedInternalMovementTypes() {
  return getInternalMovementTypes();
}

export function isMovementTypeCertified(type) {
  return getActiveMovementTypes().includes(type);
}
