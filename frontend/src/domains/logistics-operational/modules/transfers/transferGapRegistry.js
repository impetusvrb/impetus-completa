/** OPM-006 — GAPs conhecidos (WMS-003 APIs congeladas). */
export const TRANSFER_GAP_REGISTRY = Object.freeze([
  {
    id: 'GAP-OPM-XFR-001',
    area: 'Transfer metadata PATCH',
    description: 'Actualização metadata (execução/pausa) via PATCH — actualmente observabilidade local',
    severity: 'medium',
    workaround: 'Persistir estado operacional em metadata no create'
  },
  {
    id: 'GAP-OPM-XFR-002',
    area: 'in_transit API',
    description: 'Status in_transit definido na BD sem endpoint dedicado',
    severity: 'low',
    workaround: 'metadata.executing + status open'
  },
  {
    id: 'GAP-OPM-XFR-003',
    area: 'Cancel transfer',
    description: 'Status cancelled na BD sem endpoint cancel',
    severity: 'low',
    targetPhase: 'OPM-006+'
  },
  {
    id: 'GAP-OPM-XFR-004',
    area: 'Warehouse Intelligence',
    description: 'Optimização zonas — contrato only OPM-007',
    severity: 'low',
    targetPhase: 'OPM-007'
  }
]);
