'use strict';

/**
 * ContextualDashboardResolver
 *
 * Camada intermediária que recebe o output do Motor B (`composeDashboardV2`)
 * e o traduz no MESMO formato que o `LiveDashboardUnifiedPanel` (Motor A
 * legacy) espera — preservando 100% do contrato e do JSX existente.
 *
 * Princípios:
 *   - INVISÍVEL VISUALMENTE — não muda chaves, ordens, tipos.
 *   - ADITIVO — preenche `layout.widgets` com cards contextualmente
 *     correctos quando o profileConfig legado não os tem.
 *   - DETERMINÍSTICO — mesmo input → mesmo output.
 *   - NUNCA LANÇA — se algo correr mal, devolve `null` e o caller usa o
 *     legacy como ground-truth.
 *
 * Saída (subset compatível com o contrato actual):
 *   {
 *     widgets: [{ id, label, type, display_order, highlight, pulse_level,
 *                 pulse_scale, live_metric, personalization_note }],
 *     personalization_overlay: { primary_axis, function_type, capabilities,
 *                                axes_priority, profile_label_v2 },
 *     gaps: [],
 *     trace_id
 *   }
 *
 * O caller (liveDashboardService) decide se usa apenas `widgets` (substituir)
 * ou se mescla (`enrich`). Esta camada nunca remove os widgets do legado;
 * apenas devolve os "ideais" do Motor B no contrato legado.
 */

const { composeDashboardV2 } = require('../dashboardEngineV2/composition/compositionEngine');

// Etiquetas humanas curtas — paridade com cards do `dashboardProfiles.cards.title`
// para manter o mesmo "tom" visual nos cabeçalhos. Não é hardcode organizacional;
// é vocabulário visual já usado no produto. Limita-se a etiquetar widgets do
// catálogo do Motor B (`dashboardWidgetRegistry`).
const WIDGET_LABELS = Object.freeze({
  kpi_cards:               'Indicadores chave',
  alertas:                 'Alertas operacionais',
  resumo_executivo:        'Resumo executivo',
  grafico_tendencia:       'Tendências operacionais',
  pergunte_ia:             'Pergunte ao Impetus',
  insights_ia:             'Insights da IA',
  manutencao:              'Manutenção',
  qualidade:               'Qualidade',
  estoque:                 'Estoque',
  logistica:               'Logística',
  operacoes:               'Operações em tempo real',
  energia:                 'Consumo energético',
  rastreabilidade:         'Rastreabilidade',
  centro_custos:           'Centro de custos',
  centro_previsao:         'Previsão financeira',
  performance:             'Performance da equipe',
  gargalos:                'Gargalos operacionais',
  desperdicio:             'Desperdício e perdas',
  grafico_custos_setor:    'Custos por setor',
  grafico_producao_demanda:'Produção × demanda',
  diagrama_industrial:     'Diagrama industrial',
  indicadores_executivos:  'Indicadores executivos',
  mapa_vazamentos:         'Mapa de vazamentos',
  receitas:                'Receitas operacionais',
  relatorio_ia:            'Relatório executivo IA'
});

const PRIORITY_TO_PULSE = Object.freeze({
  alta:  { pulse_level: 'critical', pulse_scale: 1.4, highlight: true },
  media: { pulse_level: 'warm',     pulse_scale: 1.15, highlight: false },
  baixa: { pulse_level: 'calm',     pulse_scale: 1,    highlight: false }
});

function _labelFor(widgetId) {
  return WIDGET_LABELS[widgetId] || widgetId;
}

function _pulseFor(priority) {
  return PRIORITY_TO_PULSE[priority] || PRIORITY_TO_PULSE.baixa;
}

function _liveMetricFor(widgetId, kpiByKey) {
  if (!kpiByKey || typeof kpiByKey !== 'object') return null;
  const v = kpiByKey[widgetId];
  if (v === undefined || v === null || v === '') return null;
  return { label: 'Indicador', value: v };
}

function _personalizationNoteFor(hasMetric) {
  if (hasMetric) return null;
  return 'Sem dado numérico vinculado ainda — o cartão reflete o seu perfil; complete cadastros ou integrações para valores ao vivo.';
}

/**
 * Converte um `module` do Motor B num widget no formato legado.
 */
function _moduleToLegacyWidget(mod, kpiByKey, displayOrder) {
  const id = mod.id;
  const pulse = _pulseFor(mod.prioridade);
  const live_metric = _liveMetricFor(id, kpiByKey);
  return {
    id,
    label: _labelFor(id),
    type: id || 'card',
    display_order: displayOrder,
    highlight: pulse.highlight,
    pulse_level: pulse.pulse_level,
    pulse_scale: pulse.pulse_scale,
    live_metric,
    personalization_note: _personalizationNoteFor(!!live_metric)
  };
}

/**
 * Resolve o painel via Motor B no contrato legado.
 *
 * @param {object} user                    `req.user`
 * @param {object} ctx                     contexto auxiliar
 * @param {object} ctx.kpiByKey            mapa key → valor (para live_metric)
 * @param {object} [ctx.legacyLayout]      `legacyState.layout` para fallback
 * @param {object} [opts]                  opções (traceId, maxWidgets)
 * @returns {object|null}                  resultado normalizado ou null em erro
 */
function resolveContextualDashboard(user, ctx = {}, opts = {}) {
  if (!user) return null;
  let v2 = null;
  try {
    v2 = composeDashboardV2(user, opts);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[CONTEXTUAL_RESOLVER_FAIL]', err && err.message ? err.message : err);
    }
    return null;
  }
  if (!v2 || !Array.isArray(v2.modulos)) return null;

  const max = Math.max(1, Math.min(20, Number(opts.maxWidgets) || 10));
  const modules = v2.modulos.slice(0, max);
  const widgets = modules.map((m, idx) => _moduleToLegacyWidget(m, ctx.kpiByKey, idx));

  // Gaps adicionais detectados pelo Motor B (ex.: source=context_interpreter,
  // capabilities_denied) — não substituem os gaps do legacy; são MERGE.
  const gaps = [];
  const ident = v2.identity || {};
  if (ident.sources?.area === 'context_interpreter' || ident.sources?.area === 'fallback') {
    gaps.push('área funcional resolvida por inferência — preencha o cadastro para precisão contextual');
  }
  if (Array.isArray(ident.capabilities_denied) && ident.capabilities_denied.length > 0) {
    gaps.push(`policies removeram ${ident.capabilities_denied.length} capability(ies) — ver governança contextual`);
  }
  if (ident.sources?.function === 'fallback') {
    gaps.push('função operacional inferida via fallback (cargo ausente ou desconhecido)');
  }

  return {
    widgets,
    personalization_overlay: {
      primary_axis: ident.primary_axis || null,
      function_type: ident.function_type || null,
      capabilities: ident.capabilities || [],
      axes_priority: ident.axes_priority || [],
      profile_label_v2: v2.perfil?.subtitulo || null,
      area_v2: ident.area || null,
      hierarchy_level_v2: ident.hierarchy_level ?? null
    },
    gaps,
    trace_id: v2.trace_id,
    explainability_summary: {
      widgets_count: widgets.length,
      function_type: ident.function_type || null,
      primary_axis: ident.primary_axis || null,
      max_widgets: v2.explainability?.function_policy?.max_widgets ?? null,
      data_depth: v2.explainability?.function_policy?.data_depth ?? null
    }
  };
}

module.exports = {
  resolveContextualDashboard,
  _internals: { _labelFor, _pulseFor, _liveMetricFor, WIDGET_LABELS }
};
