'use strict';
const { interpretProfileContext } = require('./profileContextInterpreter');
const { WIDGET_REGISTRY, listAllWidgets } = require('./dashboardWidgetRegistry');
const { buildFallbackMessages } = require('./dashboardFallbackBuilder');
const { buildSmartQuestions } = require('./dashboardInsightBuilder');
const { buildContextualAlerts } = require('./dashboardAlertBuilder');

const AXIS_PRIORITY = { eixo_executivo: 10, eixo_financeiro: 9, eixo_planejamento: 9, eixo_humano: 8, eixo_operacional: 8, eixo_manutencao: 8, eixo_qualidade: 8, eixo_logistica: 7, eixo_estoque: 7, eixo_laboratorial: 7, eixo_seguranca: 7 };
const AXIS_WIDGET_POLICY = {
  eixo_humano: {
    includeFirst: ['kpi_cards', 'alertas', 'insights_ia', 'pergunte_ia', 'grafico_tendencia', 'performance'],
    exclude: ['centro_custos', 'grafico_custos_setor', 'indicadores_executivos']
  }
};

function buildWidgetSet(context) {
  const axes = context.axes?.length ? context.axes : [context.primary_axis || 'eixo_operacional'];
  const policy = AXIS_WIDGET_POLICY[context.primary_axis] || null;
  const scored = [];
  for (const widgetId of listAllWidgets()) {
    if (policy?.exclude?.includes(widgetId)) continue;
    const def = WIDGET_REGISTRY[widgetId];
    const overlap = (def.axes || []).filter((axis) => axes.includes(axis)).length;
    const axisScore = (def.axes || []).reduce((acc, axis) => acc + (AXIS_PRIORITY[axis] || 5), 0) / Math.max((def.axes || []).length, 1);
    const score = (overlap * 4) + (def.minPriority || 5) + (axisScore / 10);
    if (overlap > 0) scored.push({ id: widgetId, score });
  }
  if (policy?.includeFirst?.length) {
    for (const id of policy.includeFirst) {
      const item = scored.find((w) => w.id === id);
      if (item) item.score += 5;
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 10).map((w, idx) => ({ id: w.id, posicao: idx + 1, tamanho: idx < 2 ? 'grande' : 'medio', prioridade: idx < 3 ? 'critica' : idx < 6 ? 'alta' : 'media', contexto: context.primary_axis }));
  if (!selected.some((w) => w.id === 'pergunte_ia')) selected.push({ id: 'pergunte_ia', posicao: selected.length + 1, tamanho: 'medio', prioridade: 'alta', contexto: context.primary_axis });
  return selected;
}

function createDashboardTitles(context) {
  const titleByAxis = { eixo_humano: 'Painel Vivo', eixo_operacional: 'Painel Vivo', eixo_manutencao: 'Painel Vivo', eixo_qualidade: 'Painel Vivo', eixo_logistica: 'Painel Vivo', eixo_estoque: 'Painel Vivo', eixo_financeiro: 'Painel Vivo', eixo_laboratorial: 'Painel Vivo', eixo_seguranca: 'Painel Vivo', eixo_executivo: 'Painel Vivo', eixo_planejamento: 'Painel Vivo' };
  const subtitle = context.normalized_profile?.description ? `Contexto detectado: ${context.primary_axis.replace('eixo_', '')} | baseado em cargo, setor e descricao funcional` : `Contexto detectado: ${context.primary_axis.replace('eixo_', '')} | baseado em cargo e setor`;
  return { titulo_dashboard: titleByAxis[context.primary_axis] || 'Painel Vivo Adaptativo', subtitulo: subtitle };
}

function buildPersonalizedConfig(user) {
  const context = interpretProfileContext(user);
  return {
    perfil: { cargo: context.normalized_profile?.job_title || context.normalized_profile?.role || 'colaborador', nivel: String(context.normalized_profile?.level || 6), departamento: context.normalized_profile?.area || 'geral', ...createDashboardTitles(context), eixos_ativos: context.axes },
    modulos: buildWidgetSet(context),
    assistente_ia: { especialidade: context.primary_axis, exemplos_perguntas: buildSmartQuestions(context), alertas_contextuais: buildContextualAlerts(context), mensagens_fallback: buildFallbackMessages(context) },
    explainability: { confidence: context.confidence, primary_axis: context.primary_axis, axes: context.axes, responsibilities: context.responsibilities, used_description: context.signals?.used_description === true }
  };
}

module.exports = { buildPersonalizedConfig };
