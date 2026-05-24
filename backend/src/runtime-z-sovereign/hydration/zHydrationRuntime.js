'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

/**
 * zHydrationRuntime — prepara payload de hidratação para widgets.
 * Não toca em sockets nem realtime — apenas garante que o frontend recebe
 * um plano de hidratação coerente (lista de widgets, ordem, prioridade,
 * dependências), aproveitando widgets_promoted produzidos por C0–C6.
 */
function buildHydrationPlan(payload = {}, _ctx = {}) {
  if (!flags.isHydrationRuntimeEnabled()) {
    return { plan: null, runtime_skipped: true };
  }

  const t0 = Date.now();
  const promoted = Array.isArray(payload.widgets_promoted) ? payload.widgets_promoted : [];
  const legacy = Array.isArray(payload.widgets_legacy) ? payload.widgets_legacy : [];
  const personalizedLayout = payload.personalization?.layout || payload.personalizado?.layout || null;
  const v2Layout = payload.engine_v2?.payload?.layout?.widgets || null;

  const tier1 = promoted.map((w, idx) => ({
    id: w.id || w.widget_id || `promoted_${idx}`,
    tier: 1,
    priority: idx,
    source: 'runtime_z_promoted',
    realtime: !!w.realtime,
    needs_telemetry: !!w.needs_telemetry || !!w.telemetry,
    raw: w
  }));

  const tier2 = (Array.isArray(personalizedLayout) ? personalizedLayout : []).map((w, idx) => ({
    id: w.id || w.widget_id || `perso_${idx}`,
    tier: 2,
    priority: idx,
    source: 'personalization',
    raw: w
  }));

  const tier3 = (Array.isArray(v2Layout) ? v2Layout : []).map((w, idx) => ({
    id: w.id || `v2_${idx}`,
    tier: 3,
    priority: idx,
    source: 'engine_v2_layout',
    raw: w
  }));

  const tier4 = legacy.map((w, idx) => ({
    id: w.id || w.widget_id || `legacy_${idx}`,
    tier: 4,
    priority: idx,
    source: 'motor_a_legacy',
    raw: w
  }));

  const seen = new Set();
  const plan = [];
  for (const w of [...tier1, ...tier2, ...tier3, ...tier4]) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    plan.push(w);
  }

  return {
    plan,
    tiers_used: {
      promoted: tier1.length,
      personalization: tier2.length,
      engine_v2: tier3.length,
      motor_a_legacy: tier4.length
    },
    hydration_ms: Date.now() - t0,
    runtime: 'runtime_z',
    source: 'z_hydration_runtime',
    auto_mutation: false
  };
}

module.exports = { buildHydrationPlan };
