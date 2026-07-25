/** OPM-005 — GAPs conhecidos (WMS-003 APIs congeladas). */
export const SHIPPING_GAP_REGISTRY = Object.freeze([
  {
    id: 'GAP-OPM-SHP-001',
    area: 'Shipping metadata PATCH',
    description: 'Actualização metadata (carregamento/conferência) via PATCH — actualmente POST create + dispatch',
    severity: 'medium',
    workaround: 'Persistir estado operacional em metadata no create'
  },
  {
    id: 'GAP-OPM-SHP-002',
    area: 'Transport / Yard Management',
    description: 'TMS e Yard — contratos apenas nesta fase',
    severity: 'low',
    targetPhase: 'OPM-007+'
  },
  {
    id: 'GAP-OPM-SHP-003',
    area: 'Load optimization IA',
    description: 'Optimização automática de carga — visualização nesta fase',
    severity: 'low',
    targetPhase: 'OPM-008'
  }
]);
