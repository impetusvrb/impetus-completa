/**
 * OPM-007 — Invariantes analíticos (read-only — nunca muta operação).
 */
export const WI_ANALYTICAL_INVARIANTS = Object.freeze([
  { id: 'INV-WI-001', rule: 'Não executa operações', enforcement: 'sem createMovement / complete / dispatch' },
  { id: 'INV-WI-002', rule: 'Não altera estoque', enforcement: 'consumo read-only WMS-003' },
  { id: 'INV-WI-003', rule: 'Não cria movimentos', enforcement: 'sem POST movements' },
  { id: 'INV-WI-004', rule: 'Não modifica estados operacionais', enforcement: 'sem PATCH/POST ordens' },
  { id: 'INV-WI-005', rule: 'Não interfere contratos OPM-GOV-001', enforcement: 'data consumption only' },
  { id: 'INV-WI-006', rule: 'Recomendações rastreáveis', enforcement: 'trace refs em wiRecommendationUtils' }
]);

export const WI_LAYER_PRINCIPLE = Object.freeze({
  role: 'analytical_optimization_layer',
  executesOperations: false,
  observesMeasuresCorrelatesRecommends: true,
  preparesOPM008: true
});
