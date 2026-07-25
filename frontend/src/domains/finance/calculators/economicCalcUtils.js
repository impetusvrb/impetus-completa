/**
 * FIN-EVOLVE-2.1 — Shared helpers for explainable economic calculations.
 */
export function num(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function roundMoney(v, digits = 4) {
  const n = num(v, NaN);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function traceStep(step, detail = {}) {
  return Object.freeze({ step, ...detail, ts: Date.now() });
}

/**
 * Default KPI / payload alias normalizer (GAP-FD-002 backlog — extensible).
 */
export function defaultKpiAliasNormalizer(raw = {}) {
  const costsSummary = raw.costsSummary || {};
  const summary = costsSummary.summary || costsSummary;
  const operational = summary.operational || costsSummary.operational || {};
  const impact =
    summary.impact_from_events || costsSummary.impact_from_events || {};
  const topLoss = raw.topLoss || {};
  const projectedLoss = raw.projectedLoss || {};
  const projectedImpact = raw.projectedImpact || {};

  return Object.freeze({
    perDay: num(operational.per_day ?? operational.perDay, null),
    perMonth: num(operational.per_month ?? operational.perMonth, null),
    impactLastDay: num(impact.last_day ?? impact.lastDay, null),
    impactLast7d: num(impact.last_7d ?? impact.last7d, null),
    topLossAmount: num(topLoss.total ?? topLoss.value ?? topLoss.amount ?? topLoss.impact, null),
    topLossOrigin: topLoss.origin || topLoss.label || topLoss.name || null,
    projectedLossAmount: num(
      projectedLoss.projected ?? projectedLoss.total ?? projectedLoss.value,
      null
    ),
    leakageProjected: num(
      projectedImpact.projected_impact ??
        projectedImpact.total ??
        projectedImpact.value ??
        projectedImpact.impact_30d,
      null
    ),
    byOrigin: Array.isArray(raw.byOrigin) ? raw.byOrigin : []
  });
}

/**
 * Resolve rate for a driver mapping — extensible for GAP-FD-005 plant rates.
 * Order: mapping.rate_value → plantRateProvider → byOrigin match → null
 */
export function resolveDriverRate(mapping, context = {}) {
  const trace = [];
  if (mapping.rate_value != null && Number.isFinite(Number(mapping.rate_value))) {
    const rate = num(mapping.rate_value);
    trace.push(traceStep('rate_from_mapping', { mapping_id: mapping.mapping_id, rate }));
    return { rate, currency: mapping.currency || 'BRL', unit: mapping.rate_unit, trace };
  }

  const provider = context.extensions?.plantRateProvider;
  if (typeof provider === 'function') {
    const fromPlant = provider(mapping, context);
    if (fromPlant != null && Number.isFinite(Number(fromPlant))) {
      const rate = num(fromPlant);
      trace.push(traceStep('rate_from_plantRateProvider', { mapping_id: mapping.mapping_id, rate }));
      return { rate, currency: mapping.currency || 'BRL', unit: mapping.rate_unit, trace };
    }
  }

  const originRef = mapping.cost_origin_ref;
  const byOrigin = context.normalized?.byOrigin || [];
  if (originRef && byOrigin.length) {
    const hit = byOrigin.find((o) => {
      const label = String(o.label || o.origin || o.name || '').toLowerCase();
      return label.includes(String(originRef).toLowerCase()) || String(originRef).toLowerCase().includes(label);
    });
    if (hit) {
      const rate = num(hit.day ?? hit.hour ?? hit.month ?? hit.value, null);
      if (rate != null) {
        trace.push(
          traceStep('rate_from_by_origin', {
            mapping_id: mapping.mapping_id,
            cost_origin_ref: originRef,
            rate,
            contract: 'dashboard.costs'
          })
        );
        return { rate, currency: mapping.currency || 'BRL', unit: mapping.rate_unit, trace };
      }
    }
  }

  trace.push(
    traceStep('rate_unresolved', {
      mapping_id: mapping.mapping_id,
      note: 'Await plantRateProvider (GAP-FD-005) or cost_origin match'
    })
  );
  return { rate: null, currency: mapping.currency || 'BRL', unit: mapping.rate_unit, trace };
}

/**
 * Resolve driver quantity from context.drivers or defaults.
 */
export function resolveDriverQuantity(mapping, context = {}) {
  const drivers = context.drivers || {};
  const metric = mapping.driver_metric;
  if (drivers[metric] != null && Number.isFinite(Number(drivers[metric]))) {
    return {
      quantity: num(drivers[metric]),
      trace: [traceStep('qty_from_context', { metric, quantity: num(drivers[metric]) })]
    };
  }
  if (drivers[mapping.mapping_id] != null) {
    return {
      quantity: num(drivers[mapping.mapping_id]),
      trace: [traceStep('qty_from_mapping_id', { mapping_id: mapping.mapping_id })]
    };
  }
  // Sensible defaults for composition when telemetry absent (explainable)
  const defaults = {
    units_produced: 1,
    utilization_ratio: 1,
    kwh_consumed: 1,
    downtime_hours: 1,
    material_qty_consumed: 1,
    leak_impact: 1
  };
  const quantity = defaults[metric] ?? 1;
  return {
    quantity,
    trace: [
      traceStep('qty_default', {
        metric,
        quantity,
        note: 'No live driver qty — default 1 for unit-rate composition (explainable)'
      })
    ]
  };
}
