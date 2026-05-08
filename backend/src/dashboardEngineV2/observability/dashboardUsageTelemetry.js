'use strict';

/**
 * DashboardUsageTelemetry — captura sinais de uso real dos widgets.
 *
 * O frontend dispara eventos via `dashboard.trackInteraction(...)` ou via
 * uma rota dedicada (Phase 3). Esta camada acumula em memória (buffer
 * circular) e expõe agregações:
 *
 *   - widget_views[widget_id]              n.º de renders
 *   - widget_clicks[widget_id]             n.º de cliques/aberturas
 *   - widget_dwell_ms[widget_id]           total de tempo de permanência
 *   - widget_views_by_axis[axis]
 *   - widget_views_by_function[function]
 *
 * NÃO substitui telemetria pré-existente (`/dashboard/track`,
 * `dashboard_user_interactions` em DB). Adiciona uma vista
 * agregada em-processo para Divergence Intelligence.
 */

const DEFAULT_BUFFER_SIZE = 5000;

const _state = {
  events: [],
  size: DEFAULT_BUFFER_SIZE,
  enabled: true
};

function _now() { return Date.now(); }

function configure({ size = DEFAULT_BUFFER_SIZE, enabled = true } = {}) {
  _state.size = Math.max(500, Number(size) || DEFAULT_BUFFER_SIZE);
  _state.enabled = !!enabled;
}

function clearBuffer() {
  _state.events.length = 0;
}

const VALID_KINDS = new Set(['view', 'click', 'open', 'close', 'dwell', 'shortcut']);

/**
 * Regista um evento de uso de widget.
 * @param {object} ev
 * @param {string} ev.kind        view|click|open|close|dwell|shortcut
 * @param {string} ev.widget_id
 * @param {string} [ev.trace_id]  liga ao DashboardDecisionTrace
 * @param {string} [ev.user_id]
 * @param {string} [ev.company_id]
 * @param {string} [ev.area]
 * @param {string} [ev.function_type]
 * @param {string} [ev.axis]
 * @param {number} [ev.dwell_ms]  (apenas para kind=dwell|close)
 * @param {string} [ev.context]   contexto livre (path, etc.)
 */
function record(ev) {
  if (!_state.enabled || !ev || !ev.widget_id) return null;
  const kind = String(ev.kind || 'view');
  if (!VALID_KINDS.has(kind)) return null;
  const event = {
    timestamp: _now(),
    kind,
    widget_id: String(ev.widget_id),
    trace_id: ev.trace_id || null,
    user_id: ev.user_id || null,
    company_id: ev.company_id || null,
    area: ev.area || null,
    function_type: ev.function_type || null,
    axis: ev.axis || null,
    dwell_ms: Number.isFinite(Number(ev.dwell_ms)) ? Math.max(0, Number(ev.dwell_ms)) : null,
    context: ev.context || null
  };
  _state.events.push(event);
  while (_state.events.length > _state.size) _state.events.shift();
  // dispara hooks de aprendizagem (default = noop)
  try { require('../learning/learningHooks').notifyUsageEvent(event); } catch (_) { /* silent */ }
  return event;
}

function _bumpMap(map, key, by = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + by;
}

/**
 * Agrega eventos no buffer (opcionalmente filtrados).
 * @param {{ since?: number, area?: string, function_type?: string }} [filter]
 */
function summary(filter = {}) {
  const since = Number(filter.since) || 0;
  const area = filter.area || null;
  const fn = filter.function_type || null;

  const views = {};
  const clicks = {};
  const opens = {};
  const closes = {};
  const dwell = {};       // total ms
  const shortcuts = {};
  const byAxis = {};
  const byFunction = {};
  let total = 0;

  for (const e of _state.events) {
    if (e.timestamp < since) continue;
    if (area && e.area !== area) continue;
    if (fn && e.function_type !== fn) continue;
    total += 1;
    if (e.kind === 'view') _bumpMap(views, e.widget_id);
    else if (e.kind === 'click') _bumpMap(clicks, e.widget_id);
    else if (e.kind === 'open') _bumpMap(opens, e.widget_id);
    else if (e.kind === 'close') _bumpMap(closes, e.widget_id);
    else if (e.kind === 'shortcut') _bumpMap(shortcuts, e.widget_id);
    if (e.kind === 'dwell' || e.kind === 'close') {
      if (e.dwell_ms != null) {
        dwell[e.widget_id] = (dwell[e.widget_id] || 0) + e.dwell_ms;
      }
    }
    _bumpMap(byAxis, e.axis);
    _bumpMap(byFunction, e.function_type);
  }

  return {
    total_events: total,
    window: { since, area, function_type: fn },
    widget_views: views,
    widget_clicks: clicks,
    widget_opens: opens,
    widget_closes: closes,
    widget_dwell_ms: dwell,
    widget_shortcuts: shortcuts,
    by_axis: byAxis,
    by_function: byFunction
  };
}

module.exports = {
  configure,
  clearBuffer,
  record,
  summary,
  _state
};
