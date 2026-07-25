/**
 * FIN-EVOLVE-2.1 — Driver cost contribution calculator.
 * contribution = quantity × rate (from official driver_rate contract).
 */
import {
  listDriverMappings,
  DRIVER_RATE_CONTRACT
} from '../../../platform/readiness/finance/index.js';
import {
  resolveDriverRate,
  resolveDriverQuantity,
  roundMoney,
  traceStep
} from './economicCalcUtils.js';

export function calculateDriverContributions(context = {}) {
  const mappings = listDriverMappings();
  const contributions = [];
  const allTrace = [
    traceStep('consume_contract', { contract: DRIVER_RATE_CONTRACT.id, origin: 'FIN-READY-001' })
  ];

  for (const mapping of mappings) {
    const { rate, currency, unit, trace: rateTrace } = resolveDriverRate(mapping, context);
    const { quantity, trace: qtyTrace } = resolveDriverQuantity(mapping, context);
    const amount = rate != null ? roundMoney(quantity * rate) : null;
    contributions.push(
      Object.freeze({
        mapping_id: mapping.mapping_id,
        driver_kind: mapping.driver_kind,
        cost_category: mapping.cost_category,
        cost_origin_ref: mapping.cost_origin_ref,
        quantity,
        rate,
        rate_unit: unit,
        currency,
        amount,
        explainable: true,
        evidence: Object.freeze({
          contract: DRIVER_RATE_CONTRACT.id,
          driver_source_id: mapping.driver_source_id,
          driver_metric: mapping.driver_metric,
          formula: 'quantity × rate',
          trace: Object.freeze([...rateTrace, ...qtyTrace])
        })
      })
    );
    allTrace.push(...rateTrace, ...qtyTrace);
  }

  const resolved = contributions.filter((c) => c.amount != null);
  const total = roundMoney(resolved.reduce((s, c) => s + c.amount, 0));

  return Object.freeze({
    contract: DRIVER_RATE_CONTRACT.id,
    contributions: Object.freeze(contributions),
    resolvedCount: resolved.length,
    total,
    currency: 'BRL',
    trace: Object.freeze(allTrace)
  });
}
