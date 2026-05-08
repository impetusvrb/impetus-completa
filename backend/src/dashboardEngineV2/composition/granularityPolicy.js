'use strict';

/**
 * Política de granularidade por função.
 *
 * Define para cada `function_type`:
 *   - profundidade de dados preferida
 *   - número máximo de widgets
 *   - bias de score por categoria de widget (consolidado vs detalhado vs operacional)
 *   - requisitos de capabilities por categoria
 */

const POLICY = Object.freeze({
  decisao_estrategica: {
    data_depth: 'consolidated',
    max_widgets: 14,
    granularity: ['week', 'month'],
    // Bias balanceado: directores precisam ver consolidated mas também
    // o operacional crítico (gargalos, manutenção, vazamentos).
    score_bias: {
      consolidated: 3,
      detailed: 2,
      operational: 1
    }
  },
  analise: {
    data_depth: 'detailed',
    max_widgets: 12,
    granularity: ['day', 'week', 'month'],
    score_bias: {
      consolidated: 1,
      detailed: 4,
      operational: 1
    }
  },
  supervisao: {
    data_depth: 'operational',
    max_widgets: 9,
    granularity: ['hour', 'day'],
    score_bias: {
      consolidated: -1,
      detailed: 2,
      operational: 4
    }
  },
  execucao: {
    data_depth: 'operational',
    max_widgets: 6,
    granularity: ['hour'],
    score_bias: {
      consolidated: -3,
      detailed: -1,
      operational: 5
    }
  },
  governanca: {
    data_depth: 'detailed',
    max_widgets: 8,
    granularity: ['day', 'week', 'month'],
    score_bias: {
      consolidated: 2,
      detailed: 3,
      operational: 0
    }
  }
});

/**
 * Categoriza widget pela natureza do conteúdo.
 * Mapeamento canónico baseado em IDs do `dashboardWidgetRegistry.js`.
 */
const WIDGET_CATEGORY = Object.freeze({
  resumo_executivo:        'consolidated',
  indicadores_executivos:  'consolidated',
  centro_custos:           'consolidated',
  centro_previsao:         'consolidated',
  performance:             'consolidated',
  grafico_tendencia:       'consolidated',
  grafico_producao_demanda: 'consolidated',
  grafico_custos_setor:    'consolidated',
  relatorio_ia:            'consolidated',

  kpi_cards:               'detailed',
  insights_ia:             'detailed',
  rastreabilidade:         'detailed',
  receitas:                'detailed',
  desperdicio:             'detailed',
  gargalos:                'detailed',
  diagrama_industrial:     'detailed',
  mapa_vazamentos:         'detailed',

  alertas:                 'operational',
  pergunte_ia:             'operational',
  manutencao:              'operational',
  qualidade:               'operational',
  estoque:                 'operational',
  logistica:               'operational',
  operacoes:               'operational',
  energia:                 'operational'
});

/**
 * Capabilities mínimas por widget. Usado pelo selector V2 para filtrar.
 * Mantém compatibilidade: se um widget não estiver listado, considera-se
 * que não exige capability específica (e portanto não é filtrado).
 */
const WIDGET_CAPABILITIES_REQUIRED = Object.freeze({
  centro_custos:            ['view:financial'],
  grafico_custos_setor:     ['view:financial'],
  grafico_margem:           ['view:financial'],
  mapa_vazamentos:          ['view:financial'],
  desperdicio:              ['view:financial'],
  indicadores_executivos:   ['view:strategic'],
  resumo_executivo:         ['view:strategic'],
  relatorio_ia:             ['view:strategic'],
  centro_previsao:          ['view:strategic'],
  performance:              ['view:operational'],
  manutencao:               ['view:maintenance'],
  qualidade:                ['view:quality'],
  rastreabilidade:          ['view:quality'],
  receitas:                 ['view:quality'],
  estoque:                  ['view:logistics'],
  logistica:                ['view:logistics']
  // Todos os outros (kpi_cards, alertas, pergunte_ia, insights_ia,
  // grafico_tendencia, grafico_producao_demanda, operacoes, energia,
  // gargalos, diagrama_industrial) ficam SEM capability obrigatória.
});

/**
 * Overlay aditivo de eixos por widget.
 *
 * O `dashboardWidgetRegistry` legado classifica `mapa_vazamentos` como
 * eixo_manutencao+seguranca. Em termos de produto, vazamentos representam
 * perdas financeiras directas — um Diretor de Finanças deve vê-los. Como
 * NÃO podemos editar o registry sem afectar o Motor B existente, este
 * overlay adiciona eixos extra apenas para o V2.
 *
 * Forma: { widgetId: ['eixo_extra1', 'eixo_extra2'] }
 *
 * O selector V2 mistura registry.axes ∪ overlay[widgetId] antes do scoring.
 */
const WIDGET_AXES_OVERLAY = Object.freeze({
  mapa_vazamentos:    ['eixo_financeiro', 'eixo_operacional'],
  energia:            ['eixo_operacional'],
  rastreabilidade:    ['eixo_operacional'],
  manutencao:         ['eixo_executivo'],
  qualidade:          ['eixo_executivo'],
  gargalos:           ['eixo_executivo'],
  diagrama_industrial: ['eixo_executivo'],
  alertas:            ['eixo_executivo'],
  operacoes:          ['eixo_executivo'],
  desperdicio:        ['eixo_executivo']
});

function getPolicyFor(functionType) {
  return POLICY[functionType] || POLICY.execucao;
}

function getWidgetCategory(widgetId) {
  return WIDGET_CATEGORY[widgetId] || 'detailed';
}

function getWidgetCapabilitiesRequired(widgetId) {
  return WIDGET_CAPABILITIES_REQUIRED[widgetId] || [];
}

function getWidgetAxesOverlay(widgetId) {
  return WIDGET_AXES_OVERLAY[widgetId] || [];
}

module.exports = {
  POLICY,
  WIDGET_CATEGORY,
  WIDGET_CAPABILITIES_REQUIRED,
  WIDGET_AXES_OVERLAY,
  getPolicyFor,
  getWidgetCategory,
  getWidgetCapabilitiesRequired,
  getWidgetAxesOverlay
};
