/**
 * FIN-EVOLVE-2.3 — Apply hypotheses onto a deep-cloned economic input.
 * Never mutates the baseline object.
 */
import { getWhatIfVariable } from './whatIfVariables.js';

function deepClone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function num(v, fallback = null) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function patchByOriginLabel(byOrigin, labelPart, nextDay) {
  const needle = String(labelPart).toLowerCase();
  let hit = false;
  const next = (Array.isArray(byOrigin) ? byOrigin : []).map((row) => {
    const label = String(row.label || row.origin || row.name || '').toLowerCase();
    if (!label.includes(needle)) return row;
    hit = true;
    return { ...row, day: nextDay };
  });
  if (!hit && Number.isFinite(nextDay)) {
    next.push({ label: labelPart, day: nextDay });
  }
  return next;
}

/**
 * @param {object} baselineInput — current economic input (untouched)
 * @param {object} hypotheses — flat what-if parameters
 * @returns {{ input: object, applied: object[], contractsUsed: string[], baselineUntouched: true }}
 */
export function applyHypotheses(baselineInput = {}, hypotheses = {}) {
  const input = deepClone(baselineInput) || {};
  input.drivers = { ...(input.drivers || {}) };
  input.costsSummary = deepClone(input.costsSummary) || {};
  input.byOrigin = Array.isArray(input.byOrigin) ? deepClone(input.byOrigin) : [];
  input.extensions = { ...(input.extensions || {}) };
  input.emitEvents = false;

  const applied = [];
  const contracts = new Set();
  const rateOverrides = {};

  const h = hypotheses && typeof hypotheses === 'object' ? hypotheses : {};

  if (h.production_volume != null) {
    const units = num(h.production_volume);
    if (units != null) {
      input.drivers.units_produced = units;
      applied.push({
        key: 'production_volume',
        value: units,
        target: 'drivers.units_produced',
        variable: getWhatIfVariable('production_volume')
      });
      (getWhatIfVariable('production_volume')?.contracts || []).forEach((c) => contracts.add(c));
    }
  }

  if (h.asset_utilization != null) {
    const ratio = num(h.asset_utilization);
    if (ratio != null) {
      input.drivers.utilization_ratio = ratio;
      applied.push({
        key: 'asset_utilization',
        value: ratio,
        target: 'drivers.utilization_ratio',
        variable: getWhatIfVariable('asset_utilization')
      });
      (getWhatIfVariable('asset_utilization')?.contracts || []).forEach((c) => contracts.add(c));
    }
  }

  if (h.cost_driver != null) {
    const spec =
      typeof h.cost_driver === 'object'
        ? h.cost_driver
        : { metric: 'kwh_consumed', value: h.cost_driver };
    const metric = spec.metric || 'kwh_consumed';
    const value = num(spec.value);
    if (value != null) {
      input.drivers[metric] = value;
      applied.push({
        key: 'cost_driver',
        metric,
        value,
        target: `drivers.${metric}`,
        variable: getWhatIfVariable('cost_driver')
      });
      (getWhatIfVariable('cost_driver')?.contracts || []).forEach((c) => contracts.add(c));
    }
  }

  if (h.energy_cost != null) {
    const spec =
      typeof h.energy_cost === 'object' ? h.energy_cost : { mode: 'absolute', value: h.energy_cost };
    const mode = spec.mode || 'absolute';
    const value = num(spec.value);
    if (value != null) {
      const current = input.byOrigin.find((o) =>
        String(o.label || o.origin || '').toLowerCase().includes('energia')
      );
      const baseDay = num(current?.day, 0) ?? 0;
      const nextDay =
        mode === 'factor' ? baseDay * value : mode === 'delta' ? baseDay + value : value;
      input.byOrigin = patchByOriginLabel(input.byOrigin, 'energia', nextDay);
      if (spec.rate != null) rateOverrides['drv-energy'] = num(spec.rate);

      const op = input.costsSummary.operational || input.costsSummary.summary?.operational;
      if (op && Number.isFinite(baseDay) && Number.isFinite(nextDay)) {
        const delta = nextDay - baseDay;
        const perDay = num(op.per_day, null);
        if (perDay != null) {
          const nextSummary = deepClone(input.costsSummary);
          if (nextSummary.operational) {
            nextSummary.operational = { ...nextSummary.operational, per_day: perDay + delta };
          } else if (nextSummary.summary?.operational) {
            nextSummary.summary.operational = {
              ...nextSummary.summary.operational,
              per_day: perDay + delta
            };
          }
          input.costsSummary = nextSummary;
        }
      }
      applied.push({
        key: 'energy_cost',
        mode,
        value,
        nextDay,
        target: 'byOrigin[energia] + costsSummary.operational.per_day',
        variable: getWhatIfVariable('energy_cost')
      });
      (getWhatIfVariable('energy_cost')?.contracts || []).forEach((c) => contracts.add(c));
    }
  }

  if (h.financial_rate != null) {
    const spec =
      typeof h.financial_rate === 'object'
        ? h.financial_rate
        : { mappingId: 'drv-energy', rate: h.financial_rate };
    const mappingId = spec.mappingId || spec.mapping_id || 'drv-energy';
    const rate = num(spec.rate ?? spec.value);
    if (rate != null) {
      rateOverrides[mappingId] = rate;
      applied.push({
        key: 'financial_rate',
        mappingId,
        rate,
        target: `plantRateProvider(${mappingId})`,
        variable: getWhatIfVariable('financial_rate')
      });
      (getWhatIfVariable('financial_rate')?.contracts || []).forEach((c) => contracts.add(c));
    }
  }

  if (h.inventory_valuation != null) {
    const spec =
      typeof h.inventory_valuation === 'object'
        ? h.inventory_valuation
        : { average_cost: h.inventory_valuation };
    const seed = deepClone(input.valuationSeed) || {
      item_id: 'whatif-seed',
      quantity: 100,
      lot: 'WIF-01',
      metadata: {}
    };
    seed.metadata = { ...(seed.metadata || {}) };
    if (spec.average_cost != null) seed.metadata.average_cost = num(spec.average_cost);
    if (spec.lot_cost != null) seed.metadata.lot_cost = num(spec.lot_cost);
    if (spec.quantity != null) seed.quantity = num(spec.quantity);
    input.valuationSeed = seed;
    applied.push({
      key: 'inventory_valuation',
      value: seed.metadata,
      target: 'valuationSeed.metadata',
      variable: getWhatIfVariable('inventory_valuation')
    });
    (getWhatIfVariable('inventory_valuation')?.contracts || []).forEach((c) => contracts.add(c));
  }

  if (h.leakage != null) {
    const spec = typeof h.leakage === 'object' ? h.leakage : { projected_impact: h.leakage };
    const projected = num(spec.projected_impact ?? spec.value);
    if (projected != null) {
      input.projectedImpact = {
        ...(input.projectedImpact || {}),
        projected_impact: projected
      };
      if (spec.top_loss != null) {
        input.topLoss = { ...(input.topLoss || {}), total: num(spec.top_loss) };
      }
      if (Array.isArray(spec.alerts)) {
        input.leakageAlerts = deepClone(spec.alerts);
      } else if (spec.severity) {
        input.leakageAlerts = [
          {
            id: 'whatif-leak',
            title: 'Leakage hipotético',
            severity: spec.severity
          }
        ];
      }
      applied.push({
        key: 'leakage',
        projected,
        target: 'projectedImpact.projected_impact',
        variable: getWhatIfVariable('leakage')
      });
      (getWhatIfVariable('leakage')?.contracts || []).forEach((c) => contracts.add(c));
    }
  }

  const priorProvider = input.extensions.plantRateProvider;
  if (Object.keys(rateOverrides).length) {
    input.extensions.plantRateProvider = (mapping, context) => {
      const id = mapping?.mapping_id;
      if (id && rateOverrides[id] != null) return rateOverrides[id];
      if (typeof priorProvider === 'function') return priorProvider(mapping, context);
      return null;
    };
    applied.push({
      key: '_rate_overrides',
      value: { ...rateOverrides },
      target: 'extensions.plantRateProvider'
    });
    contracts.add('finance.driver_rate.v1');
  }

  // Functions cannot survive JSON clone — re-attach only the what-if provider
  // (priorProvider already captured above if it existed on baseline)

  return Object.freeze({
    input,
    applied: Object.freeze(applied.map((a) => Object.freeze({ ...a }))),
    contractsUsed: Object.freeze([...contracts]),
    baselineUntouched: true
  });
}

export { deepClone };
