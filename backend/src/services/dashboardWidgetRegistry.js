'use strict';
const WIDGET_REGISTRY = {
  kpi_cards: { axes: ['eixo_operacional', 'eixo_executivo', 'eixo_qualidade', 'eixo_financeiro'], minPriority: 6 },
  alertas: { axes: ['eixo_operacional', 'eixo_manutencao', 'eixo_qualidade', 'eixo_seguranca', 'eixo_humano'], minPriority: 8 },
  resumo_executivo: { axes: ['eixo_executivo', 'eixo_financeiro', 'eixo_planejamento'], minPriority: 7 },
  grafico_tendencia: { axes: ['eixo_operacional', 'eixo_financeiro', 'eixo_qualidade', 'eixo_laboratorial'], minPriority: 6 },
  pergunte_ia: { axes: ['eixo_humano', 'eixo_operacional', 'eixo_manutencao', 'eixo_qualidade', 'eixo_financeiro', 'eixo_seguranca', 'eixo_laboratorial', 'eixo_executivo', 'eixo_planejamento'], minPriority: 5 },
  insights_ia: { axes: ['eixo_humano', 'eixo_operacional', 'eixo_manutencao', 'eixo_qualidade', 'eixo_financeiro', 'eixo_logistica', 'eixo_laboratorial', 'eixo_planejamento'], minPriority: 6 },
  manutencao: { axes: ['eixo_manutencao'], minPriority: 7 }, qualidade: { axes: ['eixo_qualidade', 'eixo_laboratorial'], minPriority: 7 },
  estoque: { axes: ['eixo_estoque', 'eixo_logistica'], minPriority: 6 }, logistica: { axes: ['eixo_logistica', 'eixo_estoque'], minPriority: 6 },
  operacoes: { axes: ['eixo_operacional', 'eixo_planejamento'], minPriority: 7 }, energia: { axes: ['eixo_manutencao', 'eixo_financeiro'], minPriority: 5 },
  rastreabilidade: { axes: ['eixo_qualidade', 'eixo_laboratorial', 'eixo_logistica'], minPriority: 6 }, centro_custos: { axes: ['eixo_financeiro', 'eixo_executivo'], minPriority: 7 },
  centro_previsao: { axes: ['eixo_planejamento', 'eixo_operacional', 'eixo_financeiro'], minPriority: 6 }, performance: { axes: ['eixo_operacional', 'eixo_executivo', 'eixo_humano'], minPriority: 6 },
  gargalos: { axes: ['eixo_operacional', 'eixo_manutencao'], minPriority: 6 }, desperdicio: { axes: ['eixo_operacional', 'eixo_financeiro', 'eixo_qualidade'], minPriority: 6 },
  grafico_custos_setor: { axes: ['eixo_financeiro', 'eixo_executivo'], minPriority: 6 }, grafico_producao_demanda: { axes: ['eixo_operacional', 'eixo_planejamento'], minPriority: 6 },
  diagrama_industrial: { axes: ['eixo_operacional', 'eixo_manutencao'], minPriority: 5 }, indicadores_executivos: { axes: ['eixo_executivo', 'eixo_financeiro', 'eixo_planejamento'], minPriority: 7 },
  mapa_vazamentos: { axes: ['eixo_manutencao', 'eixo_seguranca'], minPriority: 5 }, receitas: { axes: ['eixo_qualidade', 'eixo_operacional'], minPriority: 5 }, relatorio_ia: { axes: ['eixo_executivo', 'eixo_planejamento', 'eixo_humano'], minPriority: 5 }
};
function listAllWidgets() { return Object.keys(WIDGET_REGISTRY); }
module.exports = { WIDGET_REGISTRY, listAllWidgets };
