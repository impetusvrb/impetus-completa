/**
 * OPM-008 — Invariantes cognitivos (read-only · sem execução automática).
 */
export const CL_COGNITIVE_INVARIANTS = Object.freeze([
  { id: 'INV-CL-001', rule: 'Não executa operações transacionais', enforcement: 'sem createMovement / dispatch / complete' },
  { id: 'INV-CL-002', rule: 'Não altera estados operacionais', enforcement: 'sem PATCH/POST ordens WMS' },
  { id: 'INV-CL-003', rule: 'Não cria movimentos', enforcement: 'consumo read-only WMS-003 + OPM-007' },
  { id: 'INV-CL-004', rule: 'Recomendações não automáticas', enforcement: 'action: advisory · human_decision' },
  { id: 'INV-CL-005', rule: 'Explicável e rastreável', enforcement: 'clDecisionTrace em cada insight' },
  { id: 'INV-CL-006', rule: 'Sem regras de negócio WMS', enforcement: 'heurísticas cognitivas sobre contratos OPM-GOV-001' },
  { id: 'INV-CL-007', rule: 'Simulações sem efeito colateral', enforcement: 'clScenarioUtils in-memory only' }
]);

export const CL_LAYER_PRINCIPLE = Object.freeze({
  role: 'cognitive_decision_layer',
  executesOperations: false,
  consumesOPM007Intelligence: true,
  consumesOPMGov001Contracts: true,
  predictiveAndPrescriptiveReady: true,
  noWmsBusinessRules: true
});
