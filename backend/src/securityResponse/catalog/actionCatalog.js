'use strict';

/**
 * SEC-06 — Catálogo de respostas determinísticas.
 */

const ASSIST_ACTIONS = Object.freeze([
  'EVIDENCE_SNAPSHOT',
  'ELEVATE_LOG_LEVEL',
  'PRESERVE_EVIDENCE',
  'FORCE_METRICS_COLLECT',
  'RUN_INTEGRITY_CHECK',
  'RUN_CORRELATION',
  'RUN_THREAT_INTEL',
  'CONSOLIDATED_REPORT',
  'OPEN_INTERNAL_INCIDENT'
]);

const CATALOG = Object.freeze([
  {
    id: 'observe_only',
    level: 'OBSERVE',
    recommended_response: 'Manter observação passiva — registar eventos sem acção',
    risk: 'none',
    justification: 'Severidade baixa ou actividade operacional legítima',
    rollback: 'N/A — nenhuma acção executada',
    operator_required: false,
    assistActions: []
  },
  {
    id: 'advise_review_logs',
    level: 'ADVISE',
    recommended_response: 'Rever logs nginx e endpoint /api/audit/security-observatory',
    risk: 'low',
    justification: 'Actividade suspeita detectada — confirmação humana recomendada',
    rollback: 'N/A — recomendação apenas',
    operator_required: true,
    assistActions: []
  },
  {
    id: 'advise_integrity_check',
    level: 'ADVISE',
    recommended_response: 'Executar verificação manual de integridade (SEC-04 audit endpoint)',
    risk: 'low',
    justification: 'Possível drift ou incidente correlacionado',
    rollback: 'N/A',
    operator_required: true,
    assistActions: []
  },
  {
    id: 'assist_evidence_bundle',
    level: 'ASSIST',
    recommended_response: 'Recolher snapshot de evidências e relatório consolidado',
    risk: 'low',
    justification: 'Incidente HIGH/CRITICAL — preservar evidências para forense',
    rollback: 'Remover snapshot em memória via rollback endpoint interno',
    operator_required: false,
    assistActions: ['EVIDENCE_SNAPSHOT', 'PRESERVE_EVIDENCE', 'CONSOLIDATED_REPORT', 'OPEN_INTERNAL_INCIDENT']
  },
  {
    id: 'assist_full_analysis',
    level: 'ASSIST',
    recommended_response: 'Executar ciclo completo SEC-02/03/04 + métricas reforçadas',
    risk: 'low',
    justification: 'Incidente crítico — enriquecer contexto sem alterar runtime',
    rollback: 'Restaurar nível de log; descartar snapshot temporário',
    operator_required: false,
    assistActions: [
      'RUN_CORRELATION',
      'RUN_THREAT_INTEL',
      'RUN_INTEGRITY_CHECK',
      'FORCE_METRICS_COLLECT',
      'ELEVATE_LOG_LEVEL',
      'CONSOLIDATED_REPORT'
    ]
  },
  {
    id: 'protect_plan_only',
    level: 'PROTECT',
    recommended_response: 'Plano de Protecção Adaptativa — requer aprovação explícita (nunca auto)',
    risk: 'high_if_executed',
    justification: 'Integridade comprometida ou ameaça crítica sustentada',
    rollback: 'Plano não executado — rollback N/A até aprovação humana',
    operator_required: true,
    assistActions: [],
    planOnly: true
  }
]);

function getCatalogEntry(id) {
  return CATALOG.find((c) => c.id === id) || null;
}

function getCatalogForLevel(level) {
  return CATALOG.filter((c) => c.level === level);
}

module.exports = {
  ASSIST_ACTIONS,
  CATALOG,
  getCatalogEntry,
  getCatalogForLevel
};
