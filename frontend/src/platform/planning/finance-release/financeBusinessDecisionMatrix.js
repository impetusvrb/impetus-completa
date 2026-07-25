/**
 * FIN-PLAN-001 — Business Decision Matrix (read-only).
 * Answers: what can the CFO decide after each release that they cannot today?
 */
import { listFinanceReleases, getFinanceRelease } from './financeReleaseRoadmap.js';

export const FINANCE_BUSINESS_DECISION_MATRIX = Object.freeze([
  Object.freeze({
    releaseId: '2.0',
    question: 'Qual decisão o Diretor Financeiro consegue tomar após esta entrega que hoje não consegue?',
    decisionsEnabled: Object.freeze([
      'Identificar desvios financeiros rapidamente',
      'Visualizar indicadores relevantes ao seu perfil (CFO/diretor)',
      'Receber e priorizar alertas financeiros accionáveis',
      'Navegar o domínio Finance como uma única superfície de decisão'
    ]),
    decisionsStillBlocked: Object.freeze([
      'Custo unitário dinâmico por lote/SKU',
      'Simulação de cenários antes de executar',
      'Optimização de stock sob ótica financeira'
    ])
  }),
  Object.freeze({
    releaseId: '2.1',
    question: 'Qual decisão o Diretor Financeiro consegue tomar após esta entrega que hoje não consegue?',
    decisionsEnabled: Object.freeze([
      'Conhecer custo real / unitário por lote, linha ou evento',
      'Identificar rentabilidade operacional relativa',
      'Priorizar acções pelo índice de performance económica',
      'Distinguir pressão económica operacional de ruído de dashboard'
    ]),
    decisionsStillBlocked: Object.freeze([
      'Simular impacto $ de um cenário no Digital Twin',
      'Decidir manutenção pelo ROI financeiro estruturado',
      'Optimizar inventário por carrying cost'
    ])
  }),
  Object.freeze({
    releaseId: '2.2',
    question: 'Qual decisão o Diretor Financeiro consegue tomar após esta entrega que hoje não consegue?',
    decisionsEnabled: Object.freeze([
      'Simular cenários financeiros operacionais antes de executar decisões',
      'Ver projeções $ sobre o estado do Digital Twin existente',
      'Comparar hipóteses what-if sem side-effects em produção',
      'Usar o Centro Cognitivo como cockpit de decisão financeira espacial'
    ]),
    decisionsStillBlocked: Object.freeze([
      'CAPEX portfolio formal',
      'Consolidação gerencial multi-planta',
      'EOQ / valuation completa de inventário (parcial em 2.3)'
    ])
  }),
  Object.freeze({
    releaseId: '2.3',
    question: 'Qual decisão o Diretor Financeiro consegue tomar após esta entrega que hoje não consegue?',
    decisionsEnabled: Object.freeze([
      'Optimizar estoque sob a ótica financeira (capital parado vs ruptura)',
      'Decidir manutenção considerando impacto económico / ROI preventivo',
      'Perguntar em linguagem natural sobre custos, vazamentos e projeções',
      'Correlacionar inteligência operacional com impacto financeiro'
    ]),
    decisionsStillBlocked: Object.freeze([
      'Gestão formal CAPEX/OPEX',
      'Consolidação gerencial multi-empresa'
    ])
  }),
  Object.freeze({
    releaseId: 'backlog',
    question: 'Qual decisão permanece explicitamente fora do caminho crítico?',
    decisionsEnabled: Object.freeze([]),
    decisionsStillBlocked: Object.freeze([
      'Aprovar e acompanhar investimentos CAPEX/OPEX com ROI formal',
      'Consolidar resultados gerenciais multi-centro / multi-planta'
    ])
  })
]);

export function getBusinessDecisionsForRelease(releaseId) {
  return FINANCE_BUSINESS_DECISION_MATRIX.find((r) => r.releaseId === String(releaseId)) ?? null;
}

export function validateFinanceBusinessDecisionMatrix() {
  const issues = [];
  for (const r of listFinanceReleases()) {
    const row = getBusinessDecisionsForRelease(r.releaseId);
    if (!row) issues.push(`missing business decisions for ${r.releaseId}`);
    else if (!row.decisionsEnabled.length) issues.push(`${r.releaseId} must enable ≥1 decision`);
  }
  if (!getBusinessDecisionsForRelease('backlog')) issues.push('backlog decisions row required');
  if (!getFinanceRelease('2.0')) issues.push('release 2.0 required for matrix integrity');
  return { valid: issues.length === 0, issues };
}
