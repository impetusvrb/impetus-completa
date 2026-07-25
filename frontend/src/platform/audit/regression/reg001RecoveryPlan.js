/**
 * REG-001 — Recovery Plan (reativar antes de reescrever).
 * Correções mínimas — NÃO implementadas nesta fase de auditoria.
 */
export const REG_RECOVERY_PLAN = Object.freeze([
  Object.freeze({
    id: 'R1',
    feature: 'mapa_vazamentos',
    cause: 'route_not_mounted',
    impact: 'Página abre; dados 404 — funcionalidade corporativa inacessível',
    minimalFix:
      'Em dashboard.js montar GET map/ranking/alerts/report/projected-impact delegando a financialLeakageDetectorService',
    risk: 'low — serviço já existe; apenas wiring',
    validation: 'npm/api: 5 endpoints 200; UI MapaVazamentoFinanceiro carrega ranking',
    priority: 1,
    effort: 'S',
    forbidden: 'Não recriar detector; não novo dashboard'
  }),
  Object.freeze({
    id: 'R2',
    feature: 'mapa_industrial',
    cause: 'route_not_mounted',
    impact: 'Centro Operações Industrial sem dados; widgets diagrama 404',
    minimalFix:
      'Montar /dashboard/industrial/* (status, events, profiles, automation, command, machines) → industrialOperationalMapService / machineBrain',
    risk: 'medium — superfície API maior; validar RBAC VIEW/CEO',
    validation: 'IndustrialOperationsCenter carrega mapa; getMachines 200',
    priority: 1,
    effort: 'M',
    forbidden: 'Não reescrever IndustrialOperationsCenter'
  }),
  Object.freeze({
    id: 'R3',
    feature: 'industrial_core_guard',
    cause: 'rbac_guard_mismatch',
    impact: 'Diretor vê menu → redirect /app (Insights, Cérebro, Mapa Industrial)',
    minimalFix:
      'Unificar critério Layout canAccessIndustrialCoreModules com App canAccessIndustrialCore (uma função partilhada)',
    risk: 'medium — alterar acesso; preferir alinhamento ao mais restritivo documentado OU expandir menu para match',
    validation: 'Diretor genérico: menu e rota consistentes (ambos permitem ou ambos ocultam)',
    priority: 1,
    effort: 'S',
    forbidden: 'Não afrouxar CEO paths; não tocar OPM/CPL'
  }),
  Object.freeze({
    id: 'R4',
    feature: 'centro_previsao_forecasting',
    cause: 'route_not_mounted',
    impact: 'Painel previsão semi-morto',
    minimalFix: 'Montar endpoints forecasting em falta OU remover métodos órfãos do api.js',
    risk: 'low–medium',
    validation: 'CentroPrevisaoOperacional sem 404 nos métodos usados',
    priority: 2,
    effort: 'M',
    forbidden: 'Não novo forecasting engine'
  }),
  Object.freeze({
    id: 'R5',
    feature: 'center_widget_deeplinks',
    cause: 'dead_click',
    impact: 'Clicks Abrir sem destino; Cérebro CC ≠ página',
    minimalFix: 'Adicionar cerebro_operacional/insights a CenterWidget.ROUTES; deep-link widgets',
    risk: 'low',
    validation: 'Click Abrir navega para path correcto',
    priority: 3,
    effort: 'S',
    forbidden: 'Não novos widgets'
  }),
  Object.freeze({
    id: 'R6',
    feature: 'kpi_industrial_orphan',
    cause: 'dead_click',
    impact: 'KPI aponta /app/industrial inexistente',
    minimalFix: 'Substituir por /app/centro-operacoes-industrial',
    risk: 'low',
    validation: 'KPI navega para página existente',
    priority: 3,
    effort: 'XS',
    forbidden: 'Não criar rota /app/industrial paralela'
  })
]);

export const REG_RECOVERY_ORDER = Object.freeze([
  '1. Verificar se a funcionalidade já existe',
  '2. Confirmar se apenas perdeu a ligação (rota, registry, API, provider, export)',
  '3. Restaurar a ligação existente',
  '4. Validar o funcionamento',
  '5. Somente se realmente não existir → nova demanda de desenvolvimento'
]);

export function listRecoveryByPriority(priority) {
  return REG_RECOVERY_PLAN.filter((r) => r.priority === priority);
}

export function validateRecoveryPlan() {
  return {
    valid: REG_RECOVERY_PLAN.length >= 5,
    priority1: listRecoveryByPriority(1).length,
    count: REG_RECOVERY_PLAN.length
  };
}
