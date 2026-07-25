/** OPM-007 — GAPs (APIs congeladas · OPM-008 futuro). */
export const WI_GAP_REGISTRY = Object.freeze([
  {
    id: 'GAP-OPM-WI-001',
    area: 'Graphical warehouse maps',
    description: 'Heatmaps preparados para mapas gráficos — visualização tabular nesta fase',
    severity: 'low',
    targetPhase: 'OPM-008'
  },
  {
    id: 'GAP-OPM-WI-002',
    area: 'Prescriptive automation',
    description: 'Recomendações informativas apenas — acção automática OPM-008',
    severity: 'low',
    targetPhase: 'OPM-008'
  },
  {
    id: 'GAP-OPM-WI-003',
    area: 'Dedicated intelligence API',
    description: 'GET /v1/warehouse/intelligence — agregação client-side WMS-003 nesta fase',
    severity: 'medium',
    workaround: 'Consolidação via wiAnalytics pipeline'
  }
]);
