/**
 * FIN-VAL-001 — Executive / operational journeys to validate.
 */
import { FIN_VAL_001_PHASE } from '../finVal001Constants.js';

/**
 * Happy-path chain: operational → financial → hub.
 */
export const FIN_VAL_PRIMARY_JOURNEY = Object.freeze({
  id: 'JV-FIN-001',
  label: 'Jornada executiva ponta-a-ponta',
  phase: FIN_VAL_001_PHASE,
  question: 'Os executivos conseguem responder perguntas de negócio apenas com o Hub Finance?',
  steps: Object.freeze([
    Object.freeze({ id: 'receiving', label: 'Recebimento', domain: 'wms', role: 'upstream_context' }),
    Object.freeze({ id: 'inventory', label: 'Estoque', domain: 'wms', contract: 'wms_inventory' }),
    Object.freeze({ id: 'consumption', label: 'Consumo', domain: 'wms/mes', contract: 'finance.wms_valuation.v1' }),
    Object.freeze({ id: 'production', label: 'Produção', domain: 'mes', contract: 'production_mes / driver_rate' }),
    Object.freeze({ id: 'costs', label: 'Custos industriais', domain: 'finance', contract: 'dashboard.costs' }),
    Object.freeze({ id: 'leakage', label: 'Leakage', domain: 'finance', contract: 'dashboard.financialLeakage' }),
    Object.freeze({ id: 'performance', label: 'Performance económica', domain: 'finance', contract: 'FIN-EVOLVE-2.1' }),
    Object.freeze({ id: 'twin', label: 'Twin Financeiro', domain: 'finance', contract: 'FIN-EVOLVE-2.2' }),
    Object.freeze({ id: 'hub', label: 'Hub Executivo', domain: 'finance', contract: 'FIN-EVOLVE-002 / 2.1 / 2.2' })
  ])
});

export const FIN_VAL_JOURNEYS = Object.freeze([
  FIN_VAL_PRIMARY_JOURNEY,
  Object.freeze({
    id: 'JV-FIN-002',
    label: 'Coerência Smart Costing ↔ custos industriais',
    question: 'O Smart Costing produz resultados coerentes com os custos industriais?',
    steps: Object.freeze([
      Object.freeze({ id: 'costs_api', label: 'Executive summary / by-origin' }),
      Object.freeze({ id: 'engine', label: 'Economic Intelligence Engine' }),
      Object.freeze({ id: 'unit_cost', label: 'Custo unitário dinâmico' }),
      Object.freeze({ id: 'consistency', label: 'Divergência dentro do limiar' })
    ])
  }),
  Object.freeze({
    id: 'JV-FIN-003',
    label: 'Twin representa estado operacional',
    question: 'O Twin Financeiro representa correctamente o estado operacional?',
    steps: Object.freeze([
      Object.freeze({ id: 'asset_map', label: 'asset_cost_map links' }),
      Object.freeze({ id: 'overlay', label: 'Financial overlay' }),
      Object.freeze({ id: 'provider', label: 'Financial Twin State' }),
      Object.freeze({ id: 'hub_card', label: 'Hub card Twin' })
    ])
  }),
  Object.freeze({
    id: 'JV-FIN-004',
    label: 'Rastreabilidade / auditoria',
    question: 'A rastreabilidade (trace e evidence) é suficiente para auditoria?',
    steps: Object.freeze([
      Object.freeze({ id: 'smart_evidence', label: 'Smart Costing evidence' }),
      Object.freeze({ id: 'perf_evidence', label: 'Performance evidence' }),
      Object.freeze({ id: 'overlay_evidence', label: 'Twin overlay evidence' })
    ])
  })
]);

export function validateFinValJourneys() {
  const issues = [];
  if (FIN_VAL_JOURNEYS.length < 4) issues.push('journeys incomplete');
  if (FIN_VAL_PRIMARY_JOURNEY.steps.length < 8) issues.push('primary journey too short');
  const ids = new Set();
  for (const j of FIN_VAL_JOURNEYS) {
    if (ids.has(j.id)) issues.push(`duplicate ${j.id}`);
    ids.add(j.id);
    if (!j.question) issues.push(`${j.id} missing question`);
  }
  return { valid: issues.length === 0, issues, count: FIN_VAL_JOURNEYS.length };
}
