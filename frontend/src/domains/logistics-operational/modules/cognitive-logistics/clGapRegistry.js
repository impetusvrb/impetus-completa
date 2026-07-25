/** OPM-008 — GAPs (evolução futura sem alterar contratos). */
export const CL_GAP_REGISTRY = Object.freeze([
  {
    id: 'GAP-OPM-CL-001',
    area: 'ML/Statistical models',
    description: 'Heurísticas determinísticas nesta fase — modelos IA plugáveis via clHeuristicRules interface',
    severity: 'low',
    targetPhase: 'OPM-008+'
  },
  {
    id: 'GAP-OPM-CL-002',
    area: 'Prescriptive automation',
    description: 'Recomendações advisory only — execução automática fora de scope WMS transacional',
    severity: 'low',
    targetPhase: 'future'
  },
  {
    id: 'GAP-OPM-CL-003',
    area: 'Dedicated cognitive API',
    description: 'GET /v1/logistics/cognitive — pipeline client-side OPM-007 + WMS-003 nesta fase',
    severity: 'medium',
    workaround: 'useCognitiveLogisticsFoundation aggregation'
  }
]);
