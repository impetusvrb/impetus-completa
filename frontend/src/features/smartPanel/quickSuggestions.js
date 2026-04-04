/** Sugestões rápidas por perfil de menu (resolveMenuRole). */
export const quickSuggestionsByRole = {
  admin: [
    'Visão geral dos módulos ativos hoje',
    'Resumo de KPIs e alertas críticos',
    'Indicadores da operação e comunicações'
  ],
  ceo: [
    'Painel executivo: KPIs e riscos',
    'Comparativo de performance por área',
    'Alertas e propostas em aberto'
  ],
  diretor: [
    'KPIs do meu âmbito esta semana',
    'Insights de IA sobre a operação',
    'Resumo de interações e alertas'
  ],
  gerente: [
    'KPIs da equipa e metas',
    'Funil de propostas e comunicações',
    'Alertas e pendências críticas'
  ],
  coordenador: [
    'Status operacional do turno',
    'Tarefas e ocorrências recentes',
    'Indicadores da minha área'
  ],
  supervisor: [
    'Resumo do turno e alertas',
    'Indicadores da equipa',
    'Comunicações prioritárias'
  ],
  operador: [
    'Minha operação e indicadores do dia',
    'Alertas que me dizem respeito',
    'Resumo simples de KPIs'
  ],
  rh: [
    'Indicadores de equipa autorizados',
    'Resumo de comunicações internas',
    'Métricas de RH disponíveis'
  ],
  colaborador: [
    'Resumo dos meus indicadores',
    'Alertas e comunicações recentes',
    'Visão geral do dashboard'
  ]
};

export function getQuickSuggestions(ctx) {
  const k = ctx?.roleKey || 'colaborador';
  return quickSuggestionsByRole[k] || quickSuggestionsByRole.colaborador;
}
