/**
 * OPM-GOV-001 — Operational Lifecycle Baseline (congelado).
 * Fonte certificada: OPM-E2E-001 · OPM-003/002A/004/005.
 */
export const OPM_GOV_001_PHASE = 'OPM-GOV-001';

export const OPM_GOV_001_LIFECYCLE = Object.freeze({
  receiving: Object.freeze({
    moduleId: 'receiving',
    phase: 'OPM-003',
    states: Object.freeze([
      { id: 'created', label: 'Created', mapsTo: 'planned' },
      { id: 'scheduled', label: 'Scheduled', mapsTo: 'in_transit' },
      { id: 'receiving', label: 'Receiving', mapsTo: 'planned' },
      { id: 'inspection', label: 'Inspection', mapsTo: 'inspecting' },
      { id: 'quarantine', label: 'Quarantine', optional: true, mapsTo: 'inspecting', metadataFlag: 'quarantine' },
      { id: 'completed', label: 'Completed', terminal: true, mapsTo: 'completed' }
    ]),
    transitions: Object.freeze([
      ['created', 'scheduled'],
      ['scheduled', 'receiving'],
      ['receiving', 'inspection'],
      ['inspection', 'quarantine'],
      ['quarantine', 'inspection'],
      ['inspection', 'completed'],
      ['quarantine', 'completed']
    ])
  }),
  inventory: Object.freeze({
    moduleId: 'inventory',
    phase: 'OPM-002A',
    states: Object.freeze([
      { id: 'available', label: 'Available', movementTrigger: null },
      { id: 'reserved', label: 'Reserved', movementTrigger: 'pick', metadataFlag: 'reserved' },
      { id: 'picked', label: 'Picked', movementTrigger: 'pick' },
      { id: 'issued', label: 'Issued', movementTrigger: 'issue', terminal: true }
    ]),
    transitions: Object.freeze([
      ['available', 'reserved'],
      ['reserved', 'picked'],
      ['picked', 'issued']
    ])
  }),
  picking: Object.freeze({
    moduleId: 'picking',
    phase: 'OPM-004',
    states: Object.freeze([
      { id: 'created', label: 'Created', mapsTo: 'pending' },
      { id: 'released', label: 'Released', mapsTo: 'released' },
      { id: 'executing', label: 'Executing', mapsTo: 'picking' },
      { id: 'paused', label: 'Paused', optional: true, mapsTo: 'paused' },
      { id: 'completed', label: 'Completed', terminal: true, mapsTo: 'completed' }
    ]),
    transitions: Object.freeze([
      ['created', 'released'],
      ['released', 'executing'],
      ['executing', 'paused'],
      ['paused', 'executing'],
      ['executing', 'completed']
    ])
  }),
  shipping: Object.freeze({
    moduleId: 'shipping',
    phase: 'OPM-005',
    states: Object.freeze([
      { id: 'ready', label: 'Ready', mapsTo: 'ready' },
      { id: 'loading', label: 'Loading', mapsTo: 'loading' },
      { id: 'dispatching', label: 'Dispatching', mapsTo: 'loading', metadataFlag: 'dispatching' },
      { id: 'shipped', label: 'Shipped', terminal: true, mapsTo: 'shipped' }
    ]),
    transitions: Object.freeze([
      ['ready', 'loading'],
      ['loading', 'dispatching'],
      ['dispatching', 'shipped']
    ])
  })
});

export function getLifecycleForModule(moduleId) {
  return OPM_GOV_001_LIFECYCLE[moduleId] || null;
}

export function getAllLifecycleModuleIds() {
  return Object.keys(OPM_GOV_001_LIFECYCLE);
}
