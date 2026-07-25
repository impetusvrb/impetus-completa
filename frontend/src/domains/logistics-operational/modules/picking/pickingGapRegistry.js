/** OPM-004 — GAPs conhecidos (WMS-003 APIs congeladas). */
export const PICKING_GAP_REGISTRY = Object.freeze([
  {
    id: 'GAP-OPM-PCK-001',
    area: 'Picking metadata PATCH',
    description: 'Pausa/retomada e actualização de rota via PATCH metadata — actualmente execute/complete apenas',
    severity: 'medium',
    workaround: 'Persistir estado operacional em metadata no POST create; execute/complete para lifecycle'
  },
  {
    id: 'GAP-OPM-PCK-002',
    area: 'Reserva explícita de estoque',
    description: 'API dedicada reserved_quantity — actualmente via metadata + movement pick',
    severity: 'low',
    targetPhase: 'OPM-004+'
  },
  {
    id: 'GAP-OPM-PCK-003',
    area: 'Route optimization IA',
    description: 'Optimização de rota por IA — visualização apenas nesta fase',
    severity: 'low',
    targetPhase: 'OPM-008'
  }
]);
