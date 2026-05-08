'use strict';

/**
 * DivergenceIntelligence — cruza decision-traces com usage-telemetry
 * para produzir sinais sobre **comportamento real vs decisão da IA**.
 *
 * Sinais principais:
 *   1. delivered_but_unused  — widgets entregues a uma função/área mas
 *                              raramente abertos.
 *   2. shortcut_overuse      — widgets acessados por atalho (URL directa)
 *                              em vez do dashboard — sinal de que falta no
 *                              dashboard composto.
 *   3. info_gaps_by_function — funções que registram cliques em widgets
 *                              que NÃO foram entregues a elas.
 *
 * Não decide nada — apenas observa. O Motor B pode usar estes sinais
 * em fases futuras, mas esta camada respeita a Regra Absoluta:
 * "NÃO implementar IA adaptativa nesta fase".
 */

const decisionTrace = require('./dashboardDecisionTrace');
const usageTelemetry = require('./dashboardUsageTelemetry');

const DEFAULT_LOW_USAGE_THRESHOLD = 0.1; // < 10% das deliveries → unused

function _toRatio(num, den) {
  if (!den) return 0;
  return num / den;
}

/**
 * Cruza traces e usage para detectar widgets entregues mas pouco usados.
 *
 * @param {object} [opts]
 * @param {number} [opts.lowUsageThreshold=0.1]
 * @param {string} [opts.functionType]  filtra por função
 * @returns {Array<{widget_id, deliveries, opens, ratio, area_breakdown}>}
 */
function deliveredButUnused(opts = {}) {
  const threshold = Number.isFinite(opts.lowUsageThreshold) ? opts.lowUsageThreshold : DEFAULT_LOW_USAGE_THRESHOLD;
  const fnFilter = opts.functionType || null;
  const usage = usageTelemetry.summary({ function_type: fnFilter });

  const deliveries = {}; // widget_id → counts
  const areaBreakdown = {}; // widget_id → { area: count }
  for (const trace of decisionTrace.getRecent({ limit: 1000, functionType: fnFilter })) {
    for (const w of trace.widgets.selected || []) {
      deliveries[w.id] = (deliveries[w.id] || 0) + 1;
      if (!areaBreakdown[w.id]) areaBreakdown[w.id] = {};
      const a = trace.user?.area || 'unknown';
      areaBreakdown[w.id][a] = (areaBreakdown[w.id][a] || 0) + 1;
    }
  }

  const out = [];
  for (const widgetId of Object.keys(deliveries)) {
    const opens = (usage.widget_opens[widgetId] || 0) + (usage.widget_clicks[widgetId] || 0);
    const ratio = _toRatio(opens, deliveries[widgetId]);
    if (ratio < threshold) {
      out.push({
        widget_id: widgetId,
        deliveries: deliveries[widgetId],
        opens,
        ratio: Number(ratio.toFixed(3)),
        area_breakdown: areaBreakdown[widgetId]
      });
    }
  }
  return out.sort((a, b) => b.deliveries - a.deliveries);
}

/**
 * Detecta widgets que recebem muito mais cliques via atalho/URL
 * do que via cards do dashboard. Indica que o widget é importante
 * mas o dashboard composto pode estar a ignorá-lo.
 */
function shortcutOveruse() {
  const usage = usageTelemetry.summary();
  const out = [];
  for (const widgetId of Object.keys(usage.widget_shortcuts || {})) {
    const shortcuts = usage.widget_shortcuts[widgetId] || 0;
    const opens = (usage.widget_opens[widgetId] || 0) + (usage.widget_clicks[widgetId] || 0);
    const ratio = _toRatio(shortcuts, shortcuts + opens);
    if (shortcuts >= 3 && ratio >= 0.5) {
      out.push({
        widget_id: widgetId,
        shortcut_clicks: shortcuts,
        in_dashboard_clicks: opens,
        shortcut_ratio: Number(ratio.toFixed(3))
      });
    }
  }
  return out.sort((a, b) => b.shortcut_clicks - a.shortcut_clicks);
}

/**
 * Detecta funções organizacionais que clicam em widgets que NÃO foram
 * entregues a elas — sinal de gap de informação.
 *
 * Ex.: 'analise' clica em `mapa_vazamentos` mas o dashboard delivered
 *       para `analise.production` não inclui esse widget.
 */
function infoGapsByFunction() {
  const traces = decisionTrace.getRecent({ limit: 1000 });
  const deliveredByFn = {}; // function → Set(widget)
  for (const t of traces) {
    const fn = t.user?.function_type || 'unknown';
    if (!deliveredByFn[fn]) deliveredByFn[fn] = new Set();
    for (const w of t.widgets.selected || []) deliveredByFn[fn].add(w.id);
  }

  const usage = usageTelemetry.summary();
  // Aproximação: para cada widget clicado, listamos quais funções clicaram
  const usedByFn = {}; // function → Map(widget → count)
  for (const ev of usageTelemetry._state.events) {
    if (ev.kind !== 'click' && ev.kind !== 'open' && ev.kind !== 'shortcut') continue;
    const fn = ev.function_type || 'unknown';
    if (!usedByFn[fn]) usedByFn[fn] = {};
    usedByFn[fn][ev.widget_id] = (usedByFn[fn][ev.widget_id] || 0) + 1;
  }

  const gaps = {};
  for (const fn of Object.keys(usedByFn)) {
    const delivered = deliveredByFn[fn] || new Set();
    const usedNotDelivered = [];
    for (const widget of Object.keys(usedByFn[fn])) {
      if (!delivered.has(widget)) {
        usedNotDelivered.push({ widget_id: widget, clicks: usedByFn[fn][widget] });
      }
    }
    if (usedNotDelivered.length > 0) {
      gaps[fn] = usedNotDelivered.sort((a, b) => b.clicks - a.clicks);
    }
  }
  return { gaps, total_signals: usage.total_events };
}

/**
 * Snapshot completo dos sinais.
 */
function snapshot(opts = {}) {
  return {
    generated_at: new Date().toISOString(),
    delivered_but_unused: deliveredButUnused(opts),
    shortcut_overuse: shortcutOveruse(),
    info_gaps_by_function: infoGapsByFunction(),
    decision_trace_stats: {
      by_engine: decisionTrace.statsByEngine(),
      by_area: decisionTrace.statsByArea()
    }
  };
}

module.exports = {
  deliveredButUnused,
  shortcutOveruse,
  infoGapsByFunction,
  snapshot
};
